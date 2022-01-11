const { handleVisibility, validateVisibility } = require('.');

describe('handleVisibility', () => {
  it('does not modify external fields when mode is external', () => {
    const mode = 'external';

    const config = {
      schema: {
        name: {
          type: 'string',
        },
        email: {
          type: 'string',
          visibility: 'external',
        },
      },
    };

    const returnValue = {
      name: 'fullName',
      email: 'test@test.net',
    };

    const result = handleVisibility(mode, config, returnValue);

    expect(result).toEqual(returnValue);
  });

  it('does removes internal fields when mode is external', () => {
    const mode = 'external';

    const config = {
      schema: {
        name: {
          type: 'string',
        },
        email: {
          type: 'string',
          visibility: 'internal',
        },
      },
    };

    const returnValue = {
      name: 'fullName',
      email: 'test@test.net',
    };

    const expected = {
      name: 'fullName',
    };

    const result = handleVisibility(mode, config, returnValue);

    expect(result).toEqual(expected);
  });

  it('does not modify internal fields when mode is internal', () => {
    const mode = 'internal';

    const config = {
      schema: {
        name: {
          type: 'string',
        },
        email: {
          type: 'string',
          visibility: 'internal',
        },
      },
    };

    const returnValue = {
      name: 'fullName',
      email: 'test@test.net',
    };

    const result = handleVisibility(mode, config, returnValue);

    expect(result).toEqual(returnValue);
  });

  it('allows fields to be marked as both internal and external', () => {
    const config = {
      schema: {
        name: {
          type: 'string',
        },
        email: {
          type: 'string',
          visibility: ['external', 'internal'],
        },
      },
    };

    const returnValue = {
      name: 'fullName',
      email: 'test@test.net',
    };

    const resultInternal = handleVisibility('internal', config, returnValue);
    const resultExternal = handleVisibility('external', config, returnValue);

    expect(resultInternal).toEqual(returnValue);
    expect(resultExternal).toEqual(returnValue);
  });
});

describe('validateVisibility', () => {
  it('allows a request to continue if the mode is not set', () => {
    const req = {};
    const next = jest.fn();
    // const sendBodyMock = jest.spyOn(() => () => undefined);
    const res = {
      status: jest.fn(),
    }

    validateVisibility('INTERNAL')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('allows a request to continue if the mode matches the visibility', () => {
    const req = {
      mode: 'INTERNAL'
    };
    const next = jest.fn();
    const res = {
      status: jest.fn(),
    }

    validateVisibility('INTERNAL')(req, res, next);
    validateVisibility(['INTERNAL', 'EXTERNAL'])(req, res, next);

    expect(next).toHaveBeenCalledTimes(2);
  })

  it('declines a request with 403 if the mode does not match the visibility', () => {
    const req = {
      mode: 'EXTERNAL'
    };
    const next = jest.fn();
    const mockSend = jest.fn();
    const res = {
      status: jest.fn().mockImplementation(() => ({ send: mockSend })),
    }

    validateVisibility('INTERNAL')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockSend).toHaveBeenCalledWith({ status: 'unauthorized' });
  })
})
