// IMPORTANTE: Reemplaza esto con la dirección de tu contrato al desplegar en Sepolia
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
            // Si la red no está en MetaMask, se solicita agregarla de forma nativa
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0xaa36a7',
                        chainName: 'Sepolia Test Network',
                        nativeCurrency: { name: 'SepoliaETH', symbol: 'SEP', decimals: 18 },
                        rpcUrls: ['https://sepolia.org'],
                        blockExplorerUrls: ['
