import { Response } from "express";
import { Exception, ExceptionType } from "../models/exception.model";
import { RequestActions } from "../schemas/configs/actions.app.config.schema";
import { ClientConfigType } from "../schemas/configs/client.config.schema";
import { SyncCache } from "./cache/sync.cache.utils";
import { getConfig } from "./config.utils";
import logger from "./logger.utils";
export async function sendSyncResponses(res: Response, message_id: string, transaction_id: string, action: RequestActions, context: any) {
    try {
        if (getConfig().client.type !== ClientConfigType.synchronous) {
            throw new Exception(ExceptionType.Client_InvalidCall, "Synchronous client is not configured.", 500);
        }
        const syncCache = SyncCache.getInstance();
        syncCache.initCache(message_id, action);
        const waitTime = getConfig().app.actions.requests[action]?.ttl || 30 * 1000;
        logger.info(`Inside Client sendSyncResponses for Transaction ID : ${transaction_id} & Message ID: ${message_id}`);

        for (let i = 0; i <= waitTime; i += 1000) {
            await sleep(1000);
            const syncCacheData: any = await syncCache.getData(message_id, action);

            if (i >= waitTime) {
                if (!syncCacheData) {
                    // throw new Exception(
                    //     ExceptionType.Client_SyncCacheDataNotFound,
                    //     `Sync cache data not found for message_id: ${message_id} and action: ${action}`,
                    //     404
                    // );
                    // Returning 404 with empty response array instead of crashing app if data not found after wait time.
                    logger.info(`Sync cache data not found for Transaction ID : ${transaction_id} & Message ID: ${message_id}`);
                    res.status(404).json({
                        context,
                        responses: []
                    });
                    return;
                }

                if (syncCacheData?.responses?.length) {
                    res.status(200).json({
                        context,
                        responses: syncCacheData.responses
                    });
                    return;
                }
            }

            if (syncCacheData && syncCacheData.error) {
                res.status(400).json({
                    context,
                    error: syncCacheData.error
                });
                return;
            }

            // if (syncCacheData.responses?.length || i >= waitTime) {
            //     res.status(200).json({
            //         context,
            //         responses: syncCacheData.responses
            //     });
            //     return;
            // }
        }
    } catch (error) {
        if (error instanceof Exception) {
            throw error;
        }
        throw new Exception(ExceptionType.Client_SendSyncReponsesFailed, "Send Synchronous Responses Failed.", 500, error);
    }
}
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}