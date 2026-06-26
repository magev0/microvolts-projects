const registerCmd = require('../commands/register');
const { getConnection } = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

jest.mock('../db', () => ({
  getConnection: jest.fn()
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('mock_hashed_password'),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({ toString: () => 'mock_passphrase' }),
}));

describe('register command', () => {
  let interaction;
  let mockConn;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConn = {
      beginTransaction: jest.fn(),
      query: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
    };
    getConnection.mockResolvedValue(mockConn);
    
    interaction = {
      user: { id: 'discord123', tag: 'TestUser#1234' },
      options: {
        getString: jest.fn((name) => {
          if (name === 'username') return 'valid_user';
          if (name === 'password') return 'valid_pass';
          if (name === 'nickname') return 'valid_nick';
        })
      },
      deferReply: jest.fn().mockResolvedValue(true),
      editReply: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
      // Clear the rate limit Map by mocking Date.now or bypassing. 
      // The easiest way for this module without exposing the map is to use a different discordId per test, 
      // but let's just make sure we account for it.
  });

  it('should successfully register a user', async () => {
    // Override interaction user id to avoid rate limit collision between tests
    interaction.user.id = 'user1'; 
    
    mockConn.query.mockImplementation((sql) => {
      if (sql.includes('COUNT(*)')) return [{ count: 0 }];
      if (sql.includes('INSERT INTO users')) return { insertId: 1 };
      return [];
    });

    await registerCmd.execute(interaction);

    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(mockConn.query).toHaveBeenCalledTimes(3);
    expect(mockConn.commit).toHaveBeenCalled();
    expect(interaction.editReply.mock.calls[0][0]).toContain('✅ **Account created successfully!**');
  });

  it('should reject invalid usernames', async () => {
    interaction.user.id = 'user2';
    interaction.options.getString.mockImplementation((name) => {
      if (name === 'username') return 'a'; // Too short
      if (name === 'password') return 'valid_pass';
      if (name === 'nickname') return 'valid_nick';
    });

    await registerCmd.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('Invalid username'));
    expect(mockConn.beginTransaction).not.toHaveBeenCalled();
  });

  it('should reject if 2 accounts already exist limit is reached', async () => {
    interaction.user.id = 'user3';
    mockConn.query.mockImplementation((sql) => {
      if (sql.includes('COUNT(*)')) return [{ count: 2 }];
    });

    await registerCmd.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('maximum limit of 2 accounts'));
    expect(mockConn.rollback).toHaveBeenCalled();
  });

  it('should enforce rate limiting', async () => {
    interaction.user.id = 'user4';
    mockConn.query.mockImplementation((sql) => {
      if (sql.includes('COUNT(*)')) return [{ count: 0 }];
      if (sql.includes('INSERT INTO users')) return { insertId: 1 };
      return [];
    });

    // Run first time (success)
    await registerCmd.execute(interaction);
    expect(interaction.editReply.mock.calls[0][0]).toContain('✅');

    // Run second time immediately (should hit rate limit)
    interaction.editReply.mockClear();
    await registerCmd.execute(interaction);
    
    expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('⏳ **Slow down.**'));
  });
});
