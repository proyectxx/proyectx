// CONFIGURACIÓN: Reemplaza con las direcciones de tus contratos desplegados en las redes principales
const contractAddresses = {
    '1': 'DIRECCION_CONTRATO_ETHEREUM',
    '8453': 'DIRECCION_CONTRATO_BASE',
    '56': 'DIRECCION_CONTRATO_BSC',
    '295': 'DIRECCION_CONTRATO_HEDERA'
};

const networks = {
    ethereum: { chainId: '0x1', chainName: 'Ethereum Mainnet' },
    base: { 
        chainId: '0x2105', 
        chainName: 'Base', 
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, 
        rpcUrls: ['https://base.org'], 
        blockExplorerUrls: ['https://basescan.org'] 
    },
    bsc: { 
        chainId: '0x38', 
        chainName: 'BNB Smart Chain', 
        nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, 
        rpcUrls: ['https://binance.org'], 
        blockExplorerUrls: ['https://bscscan.com'] 
    },
    hedera: { 
        chainId: '0x127', 
        chainName: 'Hedera Mainnet EVM', 
        nativeCurrency: { name: 'HBAR', symbol: 'HBAR', decimals: 18 }, 
        rpcUrls: ['https://hashio.io'], 
        blockExplorerUrls: ['https://hashscan.io'] 
    }
};

const abi = [
    "function buyTokens(uint256 amountOfTokens) public payable",
    "function getCurrentPrice() public view returns (uint256)",
    "function swapPool() public view returns (uint256)",
    "function owner() public view returns (address)",
    "function withdrawContractTokens(uint256 amount) public"
]; 

let provider, signer, contract, currentChainId, userAddress;

async function initWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            provider = new ethers.providers.Web3Provider(window.ethereum);
            const networkInfo = await provider.getNetwork();
            currentChainId = networkInfo.chainId.toString();
            
            signer = provider.getSigner();
            userAddress = await signer.getAddress();
            
            document.getElementById('walletBtn').innerText = "Conectado: " + userAddress.substring(0,6) + "...";
            await updateContractInstance();
        } catch (err) {
            document.getElementById('log').innerText = "Error de conexión: " + err.message;
        }
    } else {
        alert("Por favor instala MetaMask.");
    }
}

async function switchNetwork(networkKey) {
    if (!window.ethereum) return alert("MetaMask no detectado.");
    const net = networks[networkKey];
    try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: net.chainId }] });
        setTimeout(initWallet, 500);
    } catch (switchError) {
        if (switchError.code === 4902 && networkKey !== 'ethereum') {
            try {
                await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [net] });
                setTimeout(initWallet, 500);
            } catch (addError) {
                document.getElementById('log').innerText = "Error al agregar red: " + addError.message;
            }
        } else {
            document.getElementById('log').innerText = "Error al cambiar de red: " + switchError.message;
        }
    }
}

async function updateContractInstance() {
    const addr = contractAddresses[currentChainId];
    if (addr && addr !== `DIRECCION_CONTRATO_${currentChainId}`) {
        contract = new ethers.Contract(addr, abi, signer);
        document.getElementById('swapForm').style.display = "block";
        document.getElementById('log').style.color = "black";
        document.getElementById('log').innerText = "Listo para operar.";
        
        try {
            const swapPoolWei = await contract.swapPool();
            document.getElementById('swapPoolAmount').innerText = parseFloat(ethers.utils.formatEther(swapPoolWei)).toLocaleString();
            
            const contractOwner = await contract.owner();
            if(userAddress.toLowerCase() === contractOwner.toLowerCase()) {
                document.getElementById('adminPanel').style.display = "block";
            } else {
                document.getElementById('adminPanel').style.display = "none";
            }
        } catch(e) {
            console.error(e);
        }
        calculatePrice();
    } else {
        document.getElementById('swapForm').style.display = "none";
        document.getElementById('adminPanel').style.display = "none";
        document.getElementById('log').style.color = "orange";
        document.getElementById('log').innerText = "Contrato no configurado para esta red en el código.";
    }
}

async function calculatePrice() {
    const tokens = document.getElementById('tokenAmount').value;
    if (tokens && tokens > 0 && contract) {
        try {
            const priceInWei = await contract.getCurrentPrice();
            const priceInEth = parseFloat(ethers.utils.formatEther(priceInWei));
            const total = tokens * priceInEth;
            
            let alertHTML = `Total a pagar: ${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} Moneda Nativa`;
            
            if (priceInEth >= 5000) {
                alertHTML += `<br><span class="alert-high">🚨 ¡ALERTA CRÍTICA! Liquidación extrema de inventario (<1M tokens). Precio: 5,000 c/u.</span>`;
            } else if (priceInEth > 0.01) {
                alertHTML += `<br><span class="alert-mid">⚠️ ¡Alerta! Precio incrementado por escasez (+2000%). Stock <5M.</span>`;
            }
            
            document.getElementById('priceCalc').innerHTML = alertHTML;
        } catch(e) {
            console.error(e);
        }
    } else {
        document.getElementById('priceCalc').innerText = `Total a pagar: 0.00 Moneda Nativa`;
    }
}

async function buyTokens() {
    const amount = document.getElementById('tokenAmount').value;
    if (!amount || amount <= 0) return alert("Ingresa una cantidad válida.");
    try {
        document.getElementById('log').innerText = "Esperando confirmación...";
        const priceInWei = await contract.getCurrentPrice();
        const priceInEth = parseFloat(ethers.utils.formatEther(priceInWei));
        const totalCostInEth = (amount * priceInEth).toString();
        
        const tx = await contract.buyTokens(amount, { value: ethers.utils.parseEther(totalCostInEth) });
        document.getElementById('log').innerText = "Procesando en blockchain...";
        await tx.wait();
        document.getElementById('log').style.color = "green";
        document.getElementById('log').innerText = `¡Éxito! Compraste ${amount} AWERT.`;
        await updateContractInstance();
    } catch (err) {
        document.getElementById('log').style.color = "red";
        document.getElementById('log').innerText = "Error: " + (err.data?.message || err.message);
    }
}

async function adminWithdraw() {
    const amount = document.getElementById('withdrawAmount').value;
    if(!amount || amount <= 0) return alert("Ingresa un monto válido.");
    try {
        document.getElementById('log').innerText = "Procesando retiro de administrador...";
        const tx = await contract.withdrawContractTokens(amount);
        await tx.wait();
        document.getElementById('log').style.color = "green";
        document.getElementById('log').innerText = `Retiro exitoso de ${amount} AWERT realizado.`;
        await updateContractInstance();
    } catch(err) {
        alert("Error en el retiro: " + (err.data?.message || err.message));
    }
}
