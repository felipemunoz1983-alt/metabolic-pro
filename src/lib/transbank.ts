import {
  WebpayPlus,
  Environment,
  IntegrationCommerceCodes,
  IntegrationApiKeys,
  Options,
} from 'transbank-sdk'

const isProduction = process.env.TRANSBANK_ENV === 'production'

/**
 * WebpayPlus.Transaction instance.
 * In integration mode uses Transbank test credentials automatically.
 * In production, reads TRANSBANK_COMMERCE_CODE and TRANSBANK_API_KEY from env.
 */
export const tbkTx = new WebpayPlus.Transaction(
  new Options(
    isProduction
      ? (process.env.TRANSBANK_COMMERCE_CODE ?? '')
      : IntegrationCommerceCodes.WEBPAY_PLUS,
    isProduction
      ? (process.env.TRANSBANK_API_KEY ?? '')
      : IntegrationApiKeys.WEBPAY,
    isProduction ? Environment.Production : Environment.Integration,
  ),
)

/** Monthly premium price in CLP */
export const PLAN_PRICE_CLP = parseInt(process.env.PLAN_PRICE_CLP ?? '14990', 10)

/** Days of premium access granted per payment */
export const PREMIUM_DAYS = 30
