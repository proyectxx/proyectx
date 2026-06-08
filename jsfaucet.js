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
let signClient; 
let currentSession = null;

// Ejecutar cuando el DOM esté completamente cargado
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById('costoTexto').innerText = `${COBRO_LUNC} LUNC`;
});

async function connectWalletConnect() {
    const statusDiv = document.getElementById('status');
    const connectBtn = document.getElementById('connectBtn');
    
    connectBtn.disabled = true;
    statusDiv.className = "";
    statusDiv.innerText = "Iniciando WalletConnect...";

    try {
        if (typeof WalletConnectSignClient === "undefined") {
            throw new Error("La librería de WalletConnect no se ha cargado correctamente. Verifica tu conexión.");
        }

        signClient = await WalletConnectSignClient.init({
            projectId: "3fcc6bba6e1b4369bc9229e710b14644" 
        });

        statusDiv.innerText = "Generando enlace de emparejamiento...";
        
        const { uri, approval } = await signClient.connect({
            requiredNamespaces: {
                cosmos: {
                    methods: ["cosmos_signAmino", "cosmos_signDirect"],
                    chains: ["cosmos:columbus-5"],
                    events: []
                }
            }
        });

        if (uri) {
            window.location.href = `terra://wc?uri=${encodeURIComponent(uri)}`;
            statusDiv.innerText = "Por favor, aprueba la solicitud de conexión en tu aplicación Station Wallet.";
        }

        currentSession = await approval();
        
        const cosmosNamespace = currentSession.namespaces.cosmos;
        if (cosmosNamespace && cosmosNamespace.accounts.length > 0) {
            const parts = cosmosNamespace.accounts[0].split(":");
            userAddress = parts[parts.length - 1]; 
            
            document.getElementById('walletAddress').value = `Cuenta: ${userAddress}`;
            connectBtn.style.display = 'none';
            document.getElementById('faucetForm').style.display = 'block';
            statusDiv.innerText = "";
            
            checkCooldown();
        } else {
            throw new Error("No se devolvieron cuentas válidas para la red Terra.");
        }

    } catch (err) {
        statusDiv.className = "error";
        statusDiv.innerText = "Error al conectar: " + err.message;
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

async function enviarTransaccionWalletConnect() {
    const statusDiv = document.getElementById('status');
    const claimBtn = document.getElementById('claimBtn');
    
    claimBtn.disabled = true;
    statusDiv.className = "";
    statusDiv.innerText = "Enviando solicitud de firma a tu teléfono...";

    try {
        let txString = JSON.stringify(txTemplate);
        txString = txString.replaceAll("{{USER_ADDRESS}}", userAddress);
        const finalTx = JSON.parse(txString);

        window.location.href = "terra://wc";

        await signClient.request({
            topic: currentSession.topic,
            chainId: "cosmos:columbus-5",
            request: {
                method: "cosmos_signAmino",
                params: {
                    signerAddress: userAddress,
                    signDoc: {
                        chain_id: CHAIN_ID,
                        fee: { 
                            amount: [{ amount: "30000000", denom: "uluna" }], 
                            gas: "250000" 
                        },
                        msgs: finalTx.msgs,
                        memo: "Faucet Claim AUSD"
                    }
                }
            }
        });

        localStorage.setItem(`last_claim_${userAddress}`, Date.now().toString());
        
        statusDiv.className = "success";
        statusDiv.innerText = "¡Éxito! Transacción firmada e instrucciones procesadas.";
        
        checkCooldown();

    } catch (err) {
        statusDiv.className = "error";
        statusDiv.innerText = "Error en la firma remota: " + err.message;
        claimBtn.disabled = false;
    }
}
