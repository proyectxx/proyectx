async function syncContractData() {
    if (!contractAddress || contractAddress.startsWith("TU_DIRECCION")) {
        document.getElementById('logOutput').innerText = "⚠️ Configura la dirección del contrato en sepolia.js";
        return;
    }
    
    contract = new ethers.Contract(contractAddress, abi, signer);
    try {
        const sPool = await contract.swapPool();
        const fPool = await contract.faucetPool();
        
        // Las condicionales previenen fallos si el elemento no existe en el HTML actual
        if (document.getElementById('swapPoolAmount')) {
            document.getElementById('swapPoolAmount').innerText = parseFloat(ethers.utils.formatEther(sPool)).toLocaleString();
        }
        if (document.getElementById('faucetPoolAmount')) {
            document.getElementById('faucetPoolAmount').innerText = parseFloat(ethers.utils.formatEther(fPool)).toLocaleString();
        }

        const ownerAddr = await contract.owner();
        if (userAddress.toLowerCase() === ownerAddr.toLowerCase()) {
            document.getElementById('adminPanel').style.boxDisplay = "none"; 
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
