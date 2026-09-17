export class IpoConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IpoConfigurationError'
  }
}

export class IpoDataSourceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'IpoDataSourceError'
  }
}
