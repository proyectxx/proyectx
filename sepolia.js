// CONFIGURACIÓN: Dirección del contrato inteligente AWERT en la red Sepolia
const contractAddress = "0xEC22cA49940c8E2c2Bd064fEFbcbbC29067a1a2B"; 

const abi = [
    "function buyTokens(uint256 amountOfTokens) public payable",
    "function claimFaucet() public payable",
    "function getCurrentPrice() public view returns (uint256)",
    "function swapPool() public view returns (uint256)",
    "function faucetPool() public view returns (uint256)",
    "function owner() public view returns (address)",
    "function withdrawContractTokens(uint256 amount) public"
];

let provider, signer, contract, userAddress;

async function connectWallet() {
    if (!window.ethereum) {
        alert("Por favor instala MetaMask.");
        return;
    }
    try {
        // Asegurar que MetaMask esté en la red Sepolia (Chain ID: 11155111 o 0xaa36a7)
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }],
            });
        } catch (switchError) {
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0xaa36a7',
                        chainName: 'Sepolia Test Network',
                        nativeCurrency: { name: 'SepoliaETH', symbol: 'SEP', decimals: 18 },
                        rpcUrls: ['https://sepolia.org'],
                        blockExplorerUrls: ['https://etherscan.io']
                    }],
                });
            }
        }

        // Solicitar cuentas a MetaMask
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        userAddress = accounts[0]; 
        
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        
        // Renderizar la billetera acortada en el HTML
        document.getElementById('connectBtn').innerText = "Conectado: " + userAddress.substring(0, 6) + "..." + userAddress.substring(38);
        document.getElementById('networkStatus').innerText = "Red: Sepolia Testnet";
        document.getElementById('networkStatus').style.color = "#4ade80";

        await syncContractData();
    } catch (err) {
        document.getElementById('logOutput').innerText = "Error de conexión: " + err.message;
    }
}

async function syncContractData() {
    if (!contractAddress || contractAddress.startsWith("TU_DIRECCION")) {
        document.getElementById('logOutput').innerText = "⚠️ Configura la dirección del contrato en sepolia.js";
        return;
    }
    
    contract = new ethers.Contract(contractAddress, abi, signer);
    try {
        const sPool = await contract.swapPool();
        const fPool = await contract.faucetPool();
        
        // Validaciones condicionales para evitar conflictos entre páginas divididas
        if (document.getElementById('swapPoolAmount')) {
            document.getElementById('swapPoolAmount').innerText = parseFloat(ethers.utils.formatEther(sPool)).toLocaleString();
        }
        if (document.getElementById('faucetPoolAmount')) {
            document.getElementById('faucetPoolAmount').innerText = parseFloat(ethers.utils.formatEther(fPool)).toLocaleString();
        }

        // Comprobación de rol de Administrador
        const ownerAddr = await contract.owner();
        if (userAddress.toLowerCase() === ownerAddr.toLowerCase()) {
            document.getElementById('adminPanel').style.display = "block";
        } else {
            document.getElementById('adminPanel').style.display = "none";
        }
        
        if (document.getElementById('tokenAmount')) {
            calculatePrice();
        }
    } catch (e) {
        console.error("Error sincronizando variables del Smart Contract:", e);
    }
}

async function calculatePrice() {
    const tokens = document.getElementById('tokenAmount').value;
    if (tokens && tokens > 0 && contract) {
        try {
            const priceInWei = await contract.getCurrentPrice();
            const priceInEth = parseFloat(ethers.utils.formatEther(priceInWei));
            const total = tokens * priceInEth;
            
            let htmlText = `Total a pagar: ${total.toLocaleString()} Sepolia ETH`;
            if (priceInEth >= 5000) {
                htmlText += `<br><span class="alert-high">🚨 ESCALADA EXTREMA (<1M stock). Precio: 5,000 ETH c/u</span>`;
            } else if (priceInEth > 0.01) {
                htmlText += `<br><span class="alert-mid">⚠️ PRECIO INCREMENTADO (<5M stock). Precio: 0.21 ETH c/u</span>`;
            }
            document.getElementById('priceCalc').innerHTML = htmlText;
        } catch(e) { console.error(e); }
    } else {
        document.getElementById('priceCalc').innerText = "Total a pagar: 0.00 Sepolia ETH";
    }
}

async function buyTokens() {
    const amount = document.getElementById('tokenAmount').value;
    if (!amount || amount <= 0) return alert("Ingresa un monto de tokens válido.");
    try {
        document.getElementById('logOutput').innerText = "Esperando confirmación en MetaMask...";
        const priceInWei = await contract.getCurrentPrice();
        const priceInEth = parseFloat(ethers.utils.formatEther(priceInWei));
        const cost = (amount * priceInEth).toString();

        const tx = await contract.buyTokens(amount, { value: ethers.utils.parseEther(cost) });
        document.getElementById('logOutput').innerText = "Transacción enviada. Procesando...";
        await tx.wait();
        
        document.getElementById('logOutput').innerText = `🎉 ¡Compra completada con éxito! Recibiste ${amount} AWERT.`;
        await syncContractData();
    } catch (err) {
        document.getElementById('logOutput').innerText = "Error: " + (err.data?.message || err.message);
    }
}

async function claimFaucet() {
    if (!contract) return alert("Conecta tu wallet primero.");
    try {
        document.getElementById('logOutput').innerText = "Procesando reclamo de Faucet...";
        const tx = await contract.claimFaucet({ value: ethers.utils.parseEther("0.01") });
        await tx.wait();
        
        document.getElementById('logOutput').innerText = "🎉 ¡Reclamo exitoso! Recibiste 1,000 AWERT de prueba.";
        await syncContractData();
    } catch (err) {
        document.getElementById('logOutput').innerText = "Error: " + (err.data?.message || err.message);
    }
}

async function adminWithdraw() {
    const amount = document.getElementById('withdrawAmount').value;
    if (!amount || amount <= 0) return alert("Monto no válido.");
    try {
        document.getElementById('logOutput').innerText = "Extrayendo fondos del contrato...";
        const tx = await contract.withdrawContractTokens(amount);
        await tx.wait();
        
        document.getElementById('logOutput').innerText = `Recuperados ${amount} tokens hacia la wallet admin.`;
        await syncContractData();
    } catch (err) {
        alert("Error de retiro: " + err.message);
    }
}


