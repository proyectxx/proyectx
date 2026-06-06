const BULL_RUN_CONTRACT = "terra1fns45s9yr2nwtas6s0umzq280ar7l23mehqsqcg4frs4ag85mufspgdw39";
const TERRAPORT_BULL_LUNC_POOL = "terra1r9kht9zlfazxpsqyuv5pm6a5xqsgs2zv72vxgexa84pzcwskgpkqz5n5pj"; // Dirección del pool específico en Terraport

async function ejecutarSwapBULL(amountInMicroTokens, deLuncABull) {
    if (deLuncABull) {
        // FLUJO: LUNC -> BULL RUN
        return {
            typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
            value: {
                sender: userAddress,
                contract: TERRAPORT_BULL_LUNC_POOL, // Llamada directa al pool
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
        // FLUJO: BULL RUN -> LUNC (Requiere Hook Base64 en el contrato CW20)
        const hookMessage = btoa(JSON.stringify({ swap: {} }));

        return {
            typeUrl: "/cosmwasm.wasm.v1.MsgExecuteContract",
            value: {
                sender: userAddress,
                contract: BULL_RUN_CONTRACT, // Importante: Se llama al contrato del Token
                msg: textToBytes(JSON.stringify({
                    send: {
                        contract: TERRAPORT_BULL_LUNC_POOL, // Destino final: El Pool de Terraport
                        amount: amountInMicroTokens.toString(),
                        msg: hookMessage
                    }
                })),
                funds: [] 
            }
        };
    }
              }
                      
