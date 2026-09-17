import { IPO_ADAPTER_TEST_ENV } from './fixtures/ipoAdapterEnv'

// Unit tests must not inherit local broker credentials or endpoints. This
// keeps CI and local execution identical and prevents accidental live calls.
Object.assign(process.env, IPO_ADAPTER_TEST_ENV)
