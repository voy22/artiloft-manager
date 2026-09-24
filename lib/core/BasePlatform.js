export class BasePlatform {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
  }

  async getProducts() {
    throw new Error('Method getProducts() must be implemented by platform');
  }

  async getCollections() {
    throw new Error('Method getCollections() must be implemented by platform');
  }

  async getCustomers() {
    throw new Error('Method getCustomers() must be implemented by platform');
  }

  async getOrders() {
    throw new Error('Method getOrders() must be implemented by platform');
  }

  validateConfig() {
    return true;
  }
}