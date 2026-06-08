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

const contractABI = [
    "function claimFaucet() public payable",
    "function faucetPool() public view returns (uint256)",
    "function owner() public view returns (address)",
    "function withdrawContractTokens(uint256 amount) public"
];

let provider, signer, contract, currentChainId, userAddress;

async function connectWallet() {
    if (window.ethereum) {
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            provider = new ethers.providers.Web3Provider(window.ethereum);
            const networkInfo = await provider.getNetwork();
            currentChainId = networkInfo.chainId.toString();
            
            signer = provider.getSigner();
            userAddress = await signer.getAddress();
            
            document.getElementById('connectBtn').innerText = "Conectado: " + userAddress.substring(0,6) + "...";
            await updateContractInstance();
        } catch (err) {
            document.getElementById('status').innerText = "Error al conectar: " + err.message;
        }
    } else {
        document.getElementById('status').innerText = "Instala MetaMask por favor.";
    }
}

async function switchNetwork(networkKey) {
    if (!window.ethereum) return alert("MetaMask no detectado.");
    const net = networks[networkKey];
    try {
        await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: net.chainId }] });
        setTimeout(connectWallet, 500);
    } catch (switchError) {
        if (switchError.code === 4902 && networkKey !== 'ethereum') {
            try {
                await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [net] });
                setTimeout(connectWallet, 500);
            } catch (addError) {
                document.getElementById('status').innerText = "Error al agregar red: " + addError.message;
            }
        } else {
            document.getElementById('status').innerText = "Error al cambiar de red: " + switchError.message;
        }
    }
}

async function updateContractInstance() {
    const addr = contractAddresses[currentChainId];
    if (addr && addr !== `DIRECCION_CONTRATO_${currentChainId}`) {
        contract = new ethers.Contract(addr, contractABI, signer);
        document.getElementById('claimBtn').style.display = "inline-block";
        document.getElementById('status').style.color = "black";
        document.getElementById('status').innerText = `Red activa detectada con éxito.`;
        
        try {
            const poolWei = await contract.faucetPool();
            document.getElementById('faucetPoolAmount').innerText = parseFloat(ethers.utils.formatEther(poolWei)).toLocaleString();
            document.getElementById('poolDisplay').style.display = "block";

            const contractOwner = await contract.owner();
            if(userAddress.toLowerCase() === contractOwner.toLowerCase()) {
                document.getElementById('adminPanel').style.display = "block";
            } else {
                document.getElementById('adminPanel').style.display = "none";
            }
        } catch(e) {
            console.error(e);
        }
    } else {
        document.getElementById('claimBtn').style.display = "none";
        document.getElementById('poolDisplay').style.display = "none";
        document.getElementById('adminPanel').style.display = "none";
        document.getElementById('status').style.color = "orange";
        document.getElementById('status').innerText = "Contrato no configurado para esta red en el código.";
    }
}

async function claimTokens() {
    try {
        document.getElementById('status').innerText = "Procesando transacción en blockchain...";
        const tx = await contract.claimFaucet({ value: ethers.utils.parseEther("0.01") });
        await tx.wait();
        document.getElementById('status').style.color = "green";
        document.getElementById('status').innerText = "¡Éxito! 1,000 AWERT reclamados correctamente.";
        await updateContractInstance();
    } catch (err) {
        document.getElementById('status').style.color = "red";
        document.getElementById('status').innerText = "Error: " + (err.data?.message || err.message);
    }
}

async function adminWithdraw() {
    const amount = document.getElementById('withdrawAmount').value;
    if(!amount || amount <= 0) return alert("Ingresa un monto válido.");
    try {
        document.getElementById('status').innerText = "Procesando retiro de administrador...";
        const tx = await contract.withdrawContractTokens(amount);
        await tx.wait();
        document.getElementById('status').style.color = "green";
        document.getElementById('status').innerText = `Retiro exitoso de ${amount} AWERT hacia tu billetera.`;
        await updateContractInstance();
    } catch(err) {
        alert("Error en el retiro: " + (err.data?.message || err.message));
    }
}
