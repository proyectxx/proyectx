(async function() {
    console.log("=== Iniciando entorno de interacción Web3 ===");

    // 1. INYECTAR ETHERS.JS (v6) DINÁMICAMENTE
    function cargarEthers() {
        return new Promise((resolve, reject) => {
            if (window.ethers) {
                resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = "https://cloudflare.com";
            document.head.appendChild(script);
            script.onload = () => {
                console.log("✅ Ethers.js v6 cargado correctamente.");
                resolve();
            };
            script.onerror = () => reject(new Error("No se pudo cargar Ethers.js"));
        });
    }

    // 2. CONECTAR Y VALIDAR METAMASK
    async function conectarMetaMask() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error("MetaMask no está instalado. Por favor instálalo.");
        }
        
        console.log("🔄 Solicitando conexión a MetaMask...");
        const cuentas = await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("✅ MetaMask conectado. Cuenta activa:", cuentas[0]);
        return cuentas[0];
    }

    // 3. ASEGURAR QUE EL USUARIO ESTÁ EN LA RED SEPOLIA
    async function asegurarRedSepolia() {
        const sepoliaChainId = '0xaa36a7'; // ID hexadecimal de Sepolia
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });

        if (currentChainId !== sepoliaChainId) {
            console.log("🔄 Cambiando de red a Sepolia...");
            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: sepoliaChainId }],
                });
                console.log("✅ Cambiado a la red Sepolia con éxito.");
            } catch (switchError) {
                // Si la red Sepolia no existe en el MetaMask del usuario, la agregamos
                if (switchError.code === 4902) {
                    console.log("🔄 Agregando la red Sepolia a MetaMask...");
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: sepoliaChainId,
                            chainName: 'Sepolia Test Network',
                            nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                            rpcUrls: ['https://sepolia.org'],
                            blockExplorerUrls: ['https://etherscan.io']
                        }],
                    });
                } else {
                    throw switchError;
                }
            }
        } else {
            console.log("✅ Ya estás en la red Sepolia.");
        }
    }

    // 4. CONFIGURAR ESCUCHADORES DE EVENTOS (Buenas prácticas)
    function configurarEventos() {
        // Evita duplicar escuchadores si ejecutas el script varias veces
        window.ethereum.removeAllListeners?.('accountsChanged');
        window.ethereum.removeAllListeners?.('chainChanged');

        window.ethereum.on('accountsChanged', (cuentas) => {
            if (cuentas.length === 0) {
                console.warn("⚠️ El usuario desconectó las cuentas.");
            } else {
                console.log("🔄 Cuenta cambiada en MetaMask a:", cuentas[0]);
            }
        });

        window.ethereum.on('chainChanged', (chainId) => {
            console.log("🔄 Red cambiada detectada (Chain ID):", chainId, "- Reiniciando interfaz...");
            window.location.reload();
        });
    }

    // 5. INTERACTUAR CON EL CONTRATO INTELIGENTE
    async function ejecutarInteraccionContrato() {
        // Inicializar el proveedor usando el objeto inyectado por MetaMask
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // ⚠️ REEMPLAZA ESTA DIRECCIÓN POR LA DE TU CONTRATO
        const contractAddress = "0xEC22cA49940c8E2c2Bd064fEFbcbbC29067a1a2B"; 
        
        // ⚠️ DEFINE AQUÍ LAS FUNCIONES DE TU CONTRATO QUE COINCIDAN CON TU ABI
        const contractABI = [
            "function balanceOf(address owner) view returns (uint256)",
            "function transfer(address to, uint256 amount) returns (bool)"
        ];

        if (contractAddress === "0x0000000000000000000000000000000000000000") {
            console.warn("⚠️ Recuerda cambiar 'contractAddress' con la dirección real de tu contrato en el código.");
            return;
        }

        const contract = new ethers.Contract(contractAddress, contractABI, signer);
        console.log("🔄 Conectado al contrato:", contractAddress);

        try {
            // Ejemplo 1: Operación de Lectura (Consulta de balance)
            console.log("🔄 Consultando datos del contrato...");
            const miDireccion = await signer.getAddress();
            const balance = await contract.balanceOf(miDireccion);
            console.log(`📊 Balance de la cuenta [${miDireccion}]:`, ethers.formatEther(balance), "tokens");

            // Ejemplo 2: Operación de Escritura (Envío de transacción)
            // Descomenta las líneas de abajo si deseas ejecutar un envío de tokens de prueba
            /*
            console.log("🔄 Enviando transacción (requiere confirmación en MetaMask)...");
            const tx = await contract.transfer("0xDIRECCION_DESTINO_AQUI", ethers.parseEther("0.1"));
            console.log("🚀 Transacción enviada. Hash:", tx.hash);
            console.log("⏳ Esperando confirmación del bloque...");
            await tx.wait();
            console.log("🎉 ¡Transacción confirmada con éxito!");
            */

        } catch (error) {
            console.error("❌ Error durante la ejecución con el contrato:", error.message || error);
        }
    }

    // FLUJO PRINCIPAL DE EJECUCIÓN
    try {
        await cargarEthers();
        await conectarMetaMask();
        await asegurarRedSepolia();
        configurarEventos();
        await ejecutarInteraccionContrato();
    } catch (error) {
        console.error("❌ Proceso interrumpido:", error.message || error);
    }
})();

