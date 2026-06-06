// ==========================================
// CONFIGURACIÓN GLOBAL DE RED Y CONTRATOS
// ==========================================
const CHAIN_ID = "columbus-5"; 
const RPC_ENDPOINT = "https://publicnode.com"; 
const BULL_RUN_CONTRACT = "terra1fns45s9yr2nwtas6s0umzq280ar7l23mehqsqcg4frs4ag85mufspgdw39";
const TERRAPORT_BULL_LUNC_POOL = "terra1r9kht9zlfazxpsqyuv5pm6a5xqsgs2zv72vxgexa84pzcwskgpkqz5n5pj";

let userAddress = null;

// Elementos del DOM
const btnConnect = document.getElementById('btn-connect');
const walletStatus = document.getElementById('wallet-status');
const btnSwap = document.getElementById('btn-swap');
const inputFrom = document.getElementById('input-from');
const inputTo = document.getElementById('input-to');
const selectFrom = document.getElementById('select-from');
const selectTo = document.getElementById('select-to');
const balanceFromDisplay = document.getElementById('balance-from');
const balanceToDisplay = document.getElementById('balance-to');

// ==========================================
// LÓGICA DE APARTADO: CONSULTA DE BALANCES
// ==========================================
async function consultarBalances() {
    if (!userAddress) return;

    try {
        const client = await window.CosmJS.CosmWasmStargate.CosmWasmClient.connect(RPC_ENDPOINT);

        // Balance 1: LUNC Nativo
        const luncBalanceObj = await client.getBalance(userAddress, "uluna");
        const luncBalance = parseFloat(luncBalanceObj.amount) / 1000000;

        // Balance 2: BULL RUN CW20
        const queryMsg = { balance: { address: userAddress } };
        let bullBalance = 0;
        
        try {
            const bullBalanceObj = await client.queryContractSmart(BULL_RUN_CONTRACT, queryMsg);
            bullBalance = parseFloat(bullBalanceObj.balance) / 1000000;
        } catch (error) {
            console.error("Error consultando balance BULL RUN:", error);
            bullBalance = 0;
        }

        // Renderizar en la interfaz según selectores
        actualizarPantallaBalances(luncBalance, bullBalance);

    } catch (error) {
        console.error("Error general al obtener balances:", error);
        balanceFromDisplay.textContent = "Saldo: Error";
        balanceToDisplay.textContent = "Saldo: Error";
    }
}

function actualizarPantallaBalances(luncBalance, bullBalance) {
    if (selectFrom.value === "uluna") {
        balanceFromDisplay.textContent = `Saldo: ${luncBalance.toFixed(2)} LUNC`;
    } else {
        balanceFromDisplay.textContent = `Saldo: ${bullBalance.toFixed(2)} BULL`;
    }

    if (selectTo.value === "uluna") {
        balanceToDisplay.textContent = `Saldo: ${luncBalance.toFixed(2)} LUNC`;
    } else {
        balanceToDisplay.textContent = `Saldo: ${bullBalance.toFixed(2)} BULL`;
    }
}

// ==========================================
// LÓGICA DE APARTADO: SIMULACIÓN DE PRECIOS
// ==========================================
async function simularIntercambio() {
    const amount = parseFloat(inputFrom.value);

    // Si no hay un monto válido, limpiamos el campo de destino
    if (!amount || amount <= 0 || isNaN(amount)) {
        inputTo.value = "";
        return;
    }

    try {
        inputTo.value = "Calculando...";
        const client = await window.CosmJS.CosmWasmStargate.CosmWasmClient.connect(RPC_ENDPOINT);
        const amountInMicro = (amount * 1000000).toFixed(0);
        const deLuncABull = selectFrom.value === "uluna";

        // Definir el activo ofrecido en el formato exigido por Terraport
        const assetInfo = deLuncABull 
            ? { native_token: { denom: "uluna" } }
            : { token: { contract_addr: BULL_RUN_CONTRACT } };

        // Estructurar el mensaje de consulta (Query Message)
        const queryMsg = {
            simulation: {
                offer_asset: {
                    info: assetInfo,
                    amount: amountInMicro.toString()
                }
            }
        };

        // Consultar al contrato del pool
        const resultado = await client.queryContractSmart(TERRAPORT_BULL_LUNC_POOL, queryMsg);

        if (resultado && resultado.return_amount) {
            const cantidadRecibida = parseFloat(resultado.return_amount) / 1000000;
            inputTo.value = cantidadRecibida.toFixed(6);
        }

    } catch (error) {
        console.error("Error al simular precio del pool:", error);
        inputTo.value = "Error";
    }
}

// ==========================================
// LÓGICA DE APARTADO: CONTRATOS Y SWAP
// ==========================================
async function estructurarMensajeSwap(amountInMicroTokens, deLuncABull) {
    if (deLuncABull) {
        // Enviar LUNC Nativo al Pool
        return {
            typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
            value: {
                sender: userAddress,
                contract: TERRAPORT_BULL_LUNC_POOL, 
                msg: textToBytes(JSON.stringify({
                    swap: {
                        offer_asset: {
                            info: { native_token: { denom: "uluna" } },
                            amount: amountInMicroTokens.toString()
                        }
                    }
                })),
                funds: [{ denom: "uluna", amount: amountInMicroTokens.toString() }]
            }
        };
    } else {
        // Enviar BULL RUN CW20 usando gancho (Hook)
        const hookMessage = btoa(JSON.stringify({ swap: {} }));

        return {
            typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
            value: {
                sender: userAddress,
                contract: BULL_RUN_CONTRACT, 
                msg: textToBytes(JSON.stringify({
                    send: {
                        contract: TERRAPORT_BULL_LUNC_POOL, 
                        amount: amountInMicroTokens.toString(),
                        msg: hookMessage 
                    }
                })),
                funds: [] 
            }
        };
    }
}

// Auxiliar para parsear strings a Bytes requeridos por CosmJS
function textToBytes(text) {
    return new TextEncoder().encode(text);
}

// Control del estado visual del botón de acción
function activarBotonSwap() {
    if (userAddress && inputFrom.value > 0) {
        btnSwap.disabled = false;
        btnSwap.textContent = "Intercambiar Tokens";
        btnSwap.className = "w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold rounded-xl text-center cursor-pointer transition-all uppercase tracking-wider";
    } else {
        btnSwap.disabled = true;
        btnSwap.textContent = userAddress ? "Ingresa un monto" : "Conecta la wallet primero";
        btnSwap.className = "w-full py-4 bg-slate-700 text-slate-400 font-bold rounded-xl text-center cursor-not-allowed transition-all uppercase tracking-wider";
    }
}

// ==========================================
// EVENTOS Y ACTIVADORES DE INTERFAZ
// ==========================================

// 1. Conexión de Wallet (Keplr)
btnConnect.addEventListener('click', async () => {
    if (!window.keplr) {
        alert("Por favor instala la extensión de Keplr Wallet.");
        return;
    }

    try {
        await window.keplr.enable(CHAIN_ID);
        const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
        const accounts = await offlineSigner.getAccounts();
        
        userAddress = accounts[0].address;
        walletStatus.textContent = `Conectado: ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        btnConnect.textContent = "Conectado";
        btnConnect.className = "px-4 py-2 bg-emerald-500 text-slate-950 font-semibold rounded-xl text-sm transition-all shadow-md";
        
        await consultarBalances();
        activarBotonSwap();
    } catch (error) {
        console.error("Error conectando wallet:", error);
        alert("La conexión falló.");
    }
});

// 2. Monitoreo de Entradas y Selectores con Estimación de Precios
inputFrom.addEventListener('input', () => {
    activarBotonSwap();
    simularIntercambio();
});

selectFrom.addEventListener('change', async () => {
    if (selectFrom.value === selectTo.value) {
        selectTo.value = selectFrom.value === "uluna" ? BULL_RUN_CONTRACT : "uluna";
    }
    await consultarBalances();
    activarBotonSwap();
    simularIntercambio();
});

selectTo.addEventListener('change', async () => {
    if (selectTo.value === selectFrom.value) {
        selectFrom.value = selectTo.value === "uluna" ? BULL_RUN_CONTRACT : "uluna";
    }
    await consultarBalances();
    activarBotonSwap();
    simularIntercambio();
});

// 3. Ejecución del botón Swap
btnSwap.addEventListener('click', async () => {
    if (!userAddress) return;

    try {
        const amount = parseFloat(inputFrom.value);
        const amountInMicro = (amount * 1000000).toFixed(0); 
        const deLuncABull = selectFrom.value === "uluna";

        btnSwap.textContent = "Procesando...";
        btnSwap.disabled = true;

        const msgToExecute = await estructurarMensajeSwap(amountInMicro, deLuncABull);
        
        const offlineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
        const client = await window.CosmJS.Stargate.SigningStargateClient.connectWithSigner(RPC_ENDPOINT, offlineSigner);

        // Estructura de comisiones estándar para LUNC (Columbus-5)
        const fee = {
            amount: [{ denom: "uluna", amount: "3000000" }], 
            gas: "500000",
        };

        const txResult = await client.signAndBroadcast(userAddress, [msgToExecute], fee, "Terraport Swap Interface");

        if (txResult.code === 0) {
            alert(`¡Swap Exitoso!\nHash: ${txResult.transactionHash}`);
            inputFrom.value = "";
            inputTo.value = "";
            await consultarBalances();
        } else {
            alert(`Fallo en la Blockchain: ${txResult.rawLog}`);
        }

    } catch (error) {
        console.error("Error ejecutando swap:", error);
         alert("Transacción cancelada o error en la firma.");
    } finally {
        activarBotonSwap();
    }
});
