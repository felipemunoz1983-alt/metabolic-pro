import {
  WebpayPlus,
  Environment,
  IntegrationCommerceCodes,
  IntegrationApiKeys,
  Options,
} from 'transbank-sdk'
import type { PlanType } from '@/types'

const isProduction = process.env.TRANSBANK_ENV === 'production'

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

/** Price in CLP per plan type */
export const PLAN_PRICES: Record<PlanType, number> = {
  professional: parseInt(process.env.PRICE_PROFESSIONAL ?? '14990', 10),
  patient:      parseInt(process.env.PRICE_PATIENT      ?? '7000',  10),
  individual:   parseInt(process.env.PRICE_INDIVIDUAL   ?? '12990', 10),
}

/** Days of access granted per payment */
export const PREMIUM_DAYS = 30

/** Backward-compat alias */
export const PLAN_PRICE_CLP = PLAN_PRICES.professional
