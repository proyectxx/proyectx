// Asegúrate de incluir este CDN en el <head> para consultas de contratos inteligentes (CosmWasm)
// <script src="https://github.io"></script>

const balanceFromDisplay = document.getElementById('balance-from');
const balanceToDisplay = document.getElementById('balance-to');

async function consultarBalances(userAddress) {
    if (!userAddress) return;

    try {
        // 1. Inicializar los clientes RPC de CosmJS
        // Usamos CosmWasmClient porque permite leer tanto contratos inteligentes como cuentas nativas
        const client = await window.CosmJS.CosmWasmStargate.CosmWasmClient.connect(RPC_ENDPOINT);

        // --- CONSULTA 1: Saldo de LUNC (Moneda Nativa) ---
        const luncBalanceObj = await client.getBalance(userAddress, "uluna");
        // Convertir de micro-lunc (uluna) a formato legible (6 decimales)
        const luncBalance = parseFloat(luncBalanceObj.amount) / 1000000;

        // --- CONSULTA 2: Saldo de BULL RUN (Token CW20) ---
        const queryMsg = { balance: { address: userAddress } };
        let bullBalance = 0;
        
        try {
            const bullBalanceObj = await client.queryContractSmart(BULL_RUN_CONTRACT, queryMsg);
            // Convertir de micro-tokens a formato legible (6 decimales habituales en Terra)
            bullBalance = parseFloat(bullBalanceObj.balance) / 1000000;
        } catch (contractError) {
            console.error("Error al consultar contrato CW20:", contractError);
            bullBalance = 0; // Si falla la consulta del contrato, asumimos 0
        }

        // 3. Renderizar saldos dinámicamente según la selección actual del usuario
        actualizarPantallaBalances(luncBalance, bullBalance);

    } catch (error) {
        console.error("Error general consultando balances:", error);
        balanceFromDisplay.textContent = "Saldo: Error";
        balanceToDisplay.textContent = "Saldo: Error";
    }
}

function actualizarPantallaBalances(luncBalance, bullBalance) {
    const tokenFrom = document.getElementById('select-from').value;
    const tokenTo = document.getElementById('select-to').value;

    // Asignar saldo al input de origen (From)
    if (tokenFrom === "uluna") {
        balanceFromDisplay.textContent = `Saldo: ${luncBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})} LUNC`;
        balanceFromDisplay.dataset.rawBalance = luncBalance; // Guardar valor numérico útil
    } else {
        balanceFromDisplay.textContent = `Saldo: ${bullBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})} BULL`;
        balanceFromDisplay.dataset.rawBalance = bullBalance;
    }

    // Asignar saldo al input de destino (To)
    if (tokenTo === "uluna") {
        balanceToDisplay.textContent = `Saldo: ${luncBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})} LUNC`;
    } else {
        balanceToDisplay.textContent = `Saldo: ${bullBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})} BULL`;
    }
}
