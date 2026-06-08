const COBRO_LUNC = 50; 
const FAUCET_COOLDOWN = 72 * 60 * 60 * 1000; 
const CHAIN_ID = "columbus-5"; // Red real de Terra Classic

const txTemplate = {
  "chain_id": CHAIN_ID,
  "msgs": [
    {
      "type": "bank/MsgSend",
      "value": {
        "from_address": "{{USER_ADDRESS}}", 
        "to_address": "terra1hc0ufrxa6uw62qgm4p0ljvzenaypt70kmc4xyu",
        "amount": [{ "amount": "50000000", "denom": "uluna" }] 
      }
    },
    {
      "type": "wasm/MsgExecuteContract",
      "value": {
        "sender": "{{USER_ADDRESS}}", 
        "contract": "terra1ug772wjenmm8mphzq0pvgvxrkgd9axngv7swrvrt3dj35sn9fmls626vml",
        "execute_msg": {
          "transfer": {
            "recipient": "{{USER_ADDRESS}}", 
            "amount": "10000000000" 
          }
        },
        "coins": []
      }
    }
  ]
};

let userAddress = "";
let timerInterval;

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('costoTexto').innerText = `${COBRO_LUNC} LUNC`;
});

async function connectKeplr() {
    const statusDiv = document.getElementById('status');
    const connectBtn = document.getElementById('connectBtn');
    
    if (!window.keplr) {
        statusDiv.className = "error";
        statusDiv.innerText = "Error: Extensión Keplr no detectada en este navegador.\nPor favor instálala antes de continuar.";
        return;
    }

    connectBtn.disabled = true;
    statusDiv.className = "";
    statusDiv.innerText = "Conectando con Keplr...";

    try {
        // Solicitar al usuario que apruebe el acceso a la red de Terra Classic
        await window.keplr.enable(CHAIN_ID);
        
        // Obtener la cuenta del firmante de Keplr
        const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
        const accounts = await offlineSigner.getAccounts();
        
        userAddress = accounts[0].address;
        
        document.getElementById('walletAddress').value = `Cuenta Keplr: ${userAddress}`;
        connectBtn.style.display = 'none';
        document.getElementById('faucetForm').style.display = 'block';
        statusDiv.innerText = "";
        
        checkCooldown();
    } catch (err) {
        statusDiv.className = "error";
        statusDiv.innerText = "Error al conectar Keplr: " + err.message;
        connectBtn.disabled = false;
    }
}

function checkCooldown() {
    clearInterval(timerInterval);
    const claimBtn = document.getElementById('claimBtn');
    const cooldownText = document.getElementById('cooldownText');
    
    const lastClaimKey = `last_claim_${userAddress}`;
    const lastClaim = localStorage.getItem(lastClaimKey);

    if (lastClaim) {
        const timePassed = Date.now() - parseInt(lastClaim);
        if (timePassed < FAUCET_COOLDOWN) {
            claimBtn.disabled = true;
            timerInterval = setInterval(() => {
                const remainingTime = FAUCET_COOLDOWN - (Date.now() - parseInt(lastClaim));
                if (remainingTime <= 0) {
                    clearInterval(timerInterval);
                    claimBtn.disabled = false;
                    cooldownText.innerText = "";
                } else {
                    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
                    const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((remainingTime % (1000 * 60)) / 1000);
                    cooldownText.innerText = `Próximo reclamo en: ${hours}h ${minutes}m ${seconds}s`;
                }
            }, 1000);
            return;
        }
    }
    claimBtn.disabled = false;
    cooldownText.innerText = "";
}

async function enviarTransaccionKeplr() {
    const statusDiv = document.getElementById('status');
    const claimBtn = document.getElementById('claimBtn');
    
    claimBtn.disabled = true;
    statusDiv.className = "";
    statusDiv.innerText = "Esperando aprobación de firma en Keplr...";

    try {
        let txString = JSON.stringify(txTemplate);
        txString = txString.replaceAll("{{USER_ADDRESS}}", userAddress);
        const finalTx = JSON.parse(txString);

        // Estructurar el documento de transacción en formato Amino (Estándar Cosmos)
        const signDoc = {
            chain_id: CHAIN_ID,
            account_number: "0", 
            sequence: "0",       
            fee: { 
                amount: [{ amount: "30000000", "denom": "uluna" }], 
                gas: "250000" 
            },
            msgs: finalTx.msgs,
            memo: "Faucet Claim AUSD"
        };

        // Solicitar la firma en la ventana emergente de Keplr
        const signResponse = await window.keplr.signAmino(CHAIN_ID, userAddress, signDoc);
        
        if (signResponse) {
            localStorage.setItem(`last_claim_${userAddress}`, Date.now().toString());
            statusDiv.className = "success";
            statusDiv.innerText = "¡Éxito! Transacción firmada correctamente a través de Keplr.";
            checkCooldown();
        } else {
            throw new Error("La firma fue rechazada o no devolvió datos válidos.");
        }

    } catch (err) {
        statusDiv.className = "error";
        statusDiv.innerText = "Error en la transacción: " + err.message;
        claimBtn.disabled = false;
    }
}

