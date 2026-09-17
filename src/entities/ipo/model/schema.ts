import { z } from 'zod'

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const NullableNonNegativeNumberSchema = z.number().nonnegative().nullable()
const NullablePositiveIntegerSchema = z.number().int().positive().nullable()
const NullableNonNegativeIntegerSchema = z
  .number()
  .int()
  .nonnegative()
  .nullable()
const NullableDepositRateSchema = z.number().positive().max(1).nullable()

export const IpoSnapshotStatusSchema = z.enum([
  'provisional',
  'final',
  'delayed',
  'unavailable',
])

export const IpoDataKindSchema = z.enum([
  'open-dart',
  'broker-direct',
  'manual',
])

export const IpoOfferingKindSchema = z.enum(['ipo', 'spac', 'rights'])

export const IpoRatioKindSchema = z.enum([
  'broker-proportional',
  'broker-total',
  'combined',
])

/**
 * A broker must explicitly identify its proportional-allocation rounding
 * rule before the UI renders a rounded allocation estimate. `null` means the
 * rule has not been supplied by the authorized source.
 */
export const IpoProportionalAllocationRoundingRuleSchema = z.enum([
  'five-round-six-up',
  'floor',
])

export const IpoDataSourceSchema = z.object({
  name: z.string().min(1),
  dataKind: IpoDataKindSchema,
  sourceAsOf: z.string().nullable(),
  fetchedAt: z.string().min(1),
  status: IpoSnapshotStatusSchema,
  coverage: z.string().min(1),
})

export const IpoSubscriptionLimitSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  maxShares: z.number().int().positive(),
})

export const IpoSubscriptionTierSchema = z.object({
  fromShares: z.number().int().positive(),
  toShares: z.number().int().positive().nullable(),
  unitShares: z.number().int().positive(),
})

export const IpoBrokerSnapshotSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().nullable(),
  underwritingShares: NullableNonNegativeIntegerSchema,
  underwritingAmount: NullableNonNegativeNumberSchema,
  underwritingMethod: z.string().nullable(),
  generalAllocationShares: NullableNonNegativeIntegerSchema,
  equalAllocationShares: NullableNonNegativeIntegerSchema,
  proportionalAllocationShares: NullableNonNegativeIntegerSchema,
  currentTotalCompetitionRatio: NullableNonNegativeNumberSchema,
  currentProportionalRatio: NullableNonNegativeNumberSchema,
  expectedFinalProportionalRatio: NullableNonNegativeNumberSchema,
  currentEqualExpectedAllocation: NullableNonNegativeNumberSchema,
  expectedEqualAllocation: NullableNonNegativeNumberSchema,
  applicantCount: NullableNonNegativeIntegerSchema,
  currentTotalDeposit: NullableNonNegativeNumberSchema,
  expectedFinalTotalDeposit: NullableNonNegativeNumberSchema,
  estimatedOneShareDeposit: NullableNonNegativeNumberSchema,
  expectedFinalOneShareDeposit: NullableNonNegativeNumberSchema,
  applicationFee: NullableNonNegativeNumberSchema,
  minSubscriptionShares: NullablePositiveIntegerSchema,
  subscriptionUnitShares: NullablePositiveIntegerSchema,
  subscriptionUnitTiers: z
    .array(IpoSubscriptionTierSchema)
    .optional()
    .default([]),
  limits: z.array(IpoSubscriptionLimitSchema),
  onlineSubscriptionNote: z.string().nullable(),
  competitionRatioKind: IpoRatioKindSchema.nullable(),
  proportionalAllocationRoundingRule:
    IpoProportionalAllocationRoundingRuleSchema.nullable(),
  competitionSource: IpoDataSourceSchema,
})

export const IpoOfferingSnapshotSchema = z.object({
  id: z.string().min(1),
  offeringKind: IpoOfferingKindSchema,
  dartCorpCode: z.string().regex(/^\d{8}$/),
  dartReceiptNo: z
    .string()
    .regex(/^\d{14}$/)
    .nullable(),
  latestDisclosureReceiptNo: z
    .string()
    .regex(/^\d{14}$/)
    .nullable(),
  name: z.string().min(1),
  subscriptionStartDate: IsoDateSchema,
  subscriptionEndDate: IsoDateSchema,
  subscriptionOpenAt: z.string().min(1).nullable(),
  subscriptionCloseAt: z.string().min(1).nullable(),
  paymentDate: IsoDateSchema.nullable(),
  allocationNoticeDate: IsoDateSchema.nullable(),
  listingDate: IsoDateSchema.nullable(),
  offerPrice: NullablePositiveIntegerSchema,
  depositRate: NullableDepositRateSchema,
  totalOfferingShares: NullablePositiveIntegerSchema,
  expectedFinalDeposit: NullableNonNegativeNumberSchema,
  expectedFinalOneShareCost: NullableNonNegativeNumberSchema,
  marketPrice: NullablePositiveIntegerSchema,
  disparityRate: z.number().nullable(),
  metadataSource: IpoDataSourceSchema,
  competitionSource: IpoDataSourceSchema,
  brokers: z.array(IpoBrokerSnapshotSchema),
})

export const IpoCompetitionFeedBrokerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().nullable(),
  generalAllocationShares: NullableNonNegativeIntegerSchema,
  equalAllocationShares: NullableNonNegativeIntegerSchema,
  proportionalAllocationShares: NullableNonNegativeIntegerSchema,
  currentTotalCompetitionRatio: NullableNonNegativeNumberSchema,
  currentProportionalRatio: NullableNonNegativeNumberSchema,
  expectedFinalProportionalRatio: NullableNonNegativeNumberSchema,
  currentEqualExpectedAllocation: NullableNonNegativeNumberSchema,
  expectedEqualAllocation: NullableNonNegativeNumberSchema,
  applicantCount: NullableNonNegativeIntegerSchema,
  currentTotalDeposit: NullableNonNegativeNumberSchema,
  expectedFinalTotalDeposit: NullableNonNegativeNumberSchema,
  estimatedOneShareDeposit: NullableNonNegativeNumberSchema,
  expectedFinalOneShareDeposit: NullableNonNegativeNumberSchema,
  applicationFee: NullableNonNegativeNumberSchema,
  minSubscriptionShares: NullablePositiveIntegerSchema,
  subscriptionUnitShares: NullablePositiveIntegerSchema,
  subscriptionUnitTiers: z
    .array(IpoSubscriptionTierSchema)
    .optional()
    .default([]),
  limits: z.array(IpoSubscriptionLimitSchema),
  onlineSubscriptionNote: z.string().nullable(),
  competitionRatioKind: IpoRatioKindSchema.nullable(),
  proportionalAllocationRoundingRule:
    IpoProportionalAllocationRoundingRuleSchema.nullable(),
  source: IpoDataSourceSchema,
})

export const IpoCompetitionFeedOfferingSchema = z.object({
  dartCorpCode: z.string().regex(/^\d{8}$/),
  companyName: z.string().optional(),
  offerPrice: NullablePositiveIntegerSchema.optional(),
  offeringKind: IpoOfferingKindSchema.optional(),
  depositRate: NullableDepositRateSchema,
  listingDate: IsoDateSchema.nullable(),
  subscriptionOpenAt: z.string().min(1).nullable(),
  subscriptionCloseAt: z.string().min(1).nullable(),
  expectedFinalDeposit: NullableNonNegativeNumberSchema,
  expectedFinalOneShareCost: NullableNonNegativeNumberSchema,
  marketPrice: NullablePositiveIntegerSchema,
  disparityRate: z.number().nullable(),
  brokers: z.array(IpoCompetitionFeedBrokerSchema),
})

export const IpoCompetitionFeedResponseSchema = z.object({
  source: IpoDataSourceSchema,
  offerings: z.array(IpoCompetitionFeedOfferingSchema),
})

export const IpoSubscriptionResponseSchema = z.object({
  requestedDate: IsoDateSchema,
  generatedAt: z.string().min(1),
  dataMode: z.enum(['dart-only', 'broker-live']),
  calendarSource: IpoDataSourceSchema,
  competitionSource: IpoDataSourceSchema,
  offerings: z.array(IpoOfferingSnapshotSchema),
})

export type IpoSnapshotStatus = z.infer<typeof IpoSnapshotStatusSchema>
export type IpoDataKind = z.infer<typeof IpoDataKindSchema>
export type IpoOfferingKind = z.infer<typeof IpoOfferingKindSchema>
export type IpoRatioKind = z.infer<typeof IpoRatioKindSchema>
export type IpoProportionalAllocationRoundingRule = z.infer<
  typeof IpoProportionalAllocationRoundingRuleSchema
>
export type IpoDataSource = z.infer<typeof IpoDataSourceSchema>
export type IpoSubscriptionLimit = z.infer<typeof IpoSubscriptionLimitSchema>
export type IpoSubscriptionTier = z.infer<typeof IpoSubscriptionTierSchema>
export type IpoBrokerSnapshot = z.infer<typeof IpoBrokerSnapshotSchema>

export type IpoOfferingSnapshot = z.infer<typeof IpoOfferingSnapshotSchema>
export type IpoCompetitionFeedBroker = z.infer<
  typeof IpoCompetitionFeedBrokerSchema
>
export type IpoCompetitionFeedOffering = z.infer<
  typeof IpoCompetitionFeedOfferingSchema
>
export type IpoCompetitionFeedResponse = z.infer<
  typeof IpoCompetitionFeedResponseSchema
>
export type IpoSubscriptionResponse = z.infer<
  typeof IpoSubscriptionResponseSchema
>
