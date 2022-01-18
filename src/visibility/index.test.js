const { handleVisibility, validateVisibility } = require('.');

const defaultUnwrapResponse = value => [value, modifiedValue => modifiedValue];

describe('handleVisibility', () => {
  it('does not modify external fields when mode is external', () => {
    const mode = 'external';

    const schema = {
      name: {
        type: 'string',
      },
      email: {
        type: 'string',
        visibility: 'external',
      },
    };

    const returnValue = {
      name: 'fullName',
      email: 'test@test.net',
    };

    const result = handleVisibility(mode, schema, defaultUnwrapResponse, returnValue);

    expect(result).toEqual(returnValue);
  });

  it('does removes internal fields when mode is external', () => {
    const mode = 'external';

    const schema = {
      name: {
        type: 'string',
      },
      email: {
        type: 'string',
        visibility: 'internal',
      },
    };

    const returnValue = {
      name: 'fullName',
      email: 'test@test.net',
    };

    const expected = {
      name: 'fullName',
    };

    const result = handleVisibility(mode, schema, defaultUnwrapResponse, returnValue);

    expect(result).toEqual(expected);
  });

  it('does not modify internal fields when mode is internal', () => {
    const mode = 'internal';

    const schema = {
      name: {
        type: 'string',
      },
      email: {
        type: 'string',
        visibility: 'internal',
      },
    };

    const returnValue = {
      name: 'fullName',
      email: 'test@test.net',
    };

    const result = handleVisibility(mode, schema, defaultUnwrapResponse, returnValue);

    expect(result).toEqual(returnValue);
  });

  it('allows fields to be marked as both internal and external', () => {
    const schema = {
      name: {
        type: 'string',
      },
      email: {
        type: 'string',
        visibility: ['external', 'internal'],
      },
    };

    const returnValue = {
      name: 'fullName',
      email: 'test@test.net',
    };

    const resultInternal = handleVisibility('internal', schema, defaultUnwrapResponse, returnValue);
    const resultExternal = handleVisibility('external', schema, defaultUnwrapResponse, returnValue);

    expect(resultInternal).toEqual(returnValue);
    expect(resultExternal).toEqual(returnValue);
  });

  it('unwraps a response and correctly filters the fields', () => {
    const mode = 'external';

    const schema = {
      name: {
        type: 'string',
      },
      email: {
        type: 'string',
        visibility: 'internal',
      },
    };

    const returnValue = {
      status: 'success',
      data: [{
        name: 'fullName',
        email: 'test@test.net',
      }]
    };

    const expected = {
      status: 'success',
      data: [{
        name: 'fullName',
      }]
    };

    const unwrapResponse = response => [response.data, modified => ({...response, data: modified})];

    const result = handleVisibility(mode, schema, unwrapResponse, returnValue);

    expect(result).toEqual(expected);
  })
});

describe('validateVisibility', () => {
  it('allows a request to continue if the mode is not set', () => {
    const req = {};
    const next = jest.fn();
    // const sendBodyMock = jest.spyOn(() => () => undefined);
    const res = {
      status: jest.fn(),
    };

    validateVisibility('INTERNAL')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('allows a request to continue if the mode matches the visibility', () => {
    const req = {
      mode: 'INTERNAL',
    };
    const next = jest.fn();
    const res = {
      status: jest.fn(),
    };

    validateVisibility('INTERNAL')(req, res, next);
    validateVisibility(['INTERNAL', 'EXTERNAL'])(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
  });

  it('declines a request with 403 if the mode does not match the visibility', () => {
    const req = {
      mode: 'EXTERNAL',
    };
    const next = jest.fn();
    const mockSend = jest.fn();
    const res = {
      status: jest.fn().mockImplementation(() => ({ send: mockSend })),
    };

    validateVisibility('INTERNAL')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockSend).toHaveBeenCalledWith({ status: 'unauthorized' });
  });
});
