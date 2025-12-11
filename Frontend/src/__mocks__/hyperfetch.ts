
export class Client {
  constructor() {}
  createRequest() {
    return ()=> ({
      send: jest.fn(),
      setParams: jest.fn(),
    });
  }

  onAuth() {
    return jest.fn();
  }

  onResponse() {
    return jest.fn();
  }
}

export type QueryParamsType = Record<string, unknown>;