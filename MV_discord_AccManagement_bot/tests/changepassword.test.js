const changePwCmd = require('../commands/changepassword');
const { getConnection } = require('../db');
const bcrypt = require('bcrypt');

jest.mock('../db', () => ({
  getConnection: jest.fn()
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('new_hash'),
  compare: jest.fn()
}));

describe('changepassword command', () => {
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
          if (name === 'old_password') return 'correct_old_pass';
          if (name === 'new_password') return 'valid_new_pass';
        })
      },
      deferReply: jest.fn().mockResolvedValue(true),
      editReply: jest.fn().mockResolvedValue(true),
    };
  });

  it('should change password successfully', async () => {
    bcrypt.compare.mockResolvedValue(true);
    mockConn.query.mockImplementation((sql) => {
      if (sql.includes('SELECT u.AccountID')) {
        return [{ AccountID: 1, Password: 'old_hash', LastPasswordChange: null, ChangePwFailures: 0, ChangePwLockoutUntil: null }];
      }
      return [];
    });

    await changePwCmd.execute(interaction);

    expect(mockConn.beginTransaction).toHaveBeenCalled();
    expect(bcrypt.compare).toHaveBeenCalledWith('correct_old_pass', 'old_hash');
    expect(mockConn.commit).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('✅ ** Password updated successfully'));
  });

  it('should reject incorrect old password and increment failures', async () => {
    bcrypt.compare.mockResolvedValue(false);
    mockConn.query.mockImplementation((sql) => {
      if (sql.includes('SELECT u.AccountID')) {
        return [{ AccountID: 1, Password: 'old_hash', LastPasswordChange: null, ChangePwFailures: 0, ChangePwLockoutUntil: null }];
      }
      return [];
    });

    await changePwCmd.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('❌ **Incorrect current password.**'));
    expect(mockConn.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE discord_links SET ChangePwFailures = ?'), [1, 1]);
    expect(mockConn.commit).toHaveBeenCalled(); // commit the failure update
  });

  it('should trigger lockout after 5 failures', async () => {
    bcrypt.compare.mockResolvedValue(false);
    mockConn.query.mockImplementation((sql) => {
      if (sql.includes('SELECT u.AccountID')) {
        return [{ AccountID: 1, Password: 'old_hash', LastPasswordChange: null, ChangePwFailures: 4, ChangePwLockoutUntil: null }];
      }
      return [];
    });

    await changePwCmd.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('🚫 **Too many incorrect attempts.**'));
    expect(mockConn.query).toHaveBeenCalledWith(expect.stringContaining('UPDATE discord_links SET ChangePwFailures = ?, ChangePwLockoutUntil = ?'), [5, expect.any(Date), 1]);
  });

  it('should reject if account does not exist or belong to user', async () => {
    mockConn.query.mockResolvedValue([]); // No rows returned

    await changePwCmd.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('❌ You do not have a registered account with that username.'));
    expect(mockConn.rollback).toHaveBeenCalled();
  });

  it('should enforce 15-minute persistent cooldown between successful password changes', async () => {
    mockConn.query.mockImplementation((sql) => {
      if (sql.includes('SELECT u.AccountID')) {
        // Mock that the password was changed 5 minutes ago
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return [{ AccountID: 1, Password: 'old_hash', LastPasswordChange: fiveMinutesAgo, ChangePwFailures: 0, ChangePwLockoutUntil: null }];
      }
      return [];
    });

    await changePwCmd.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(expect.stringContaining('⏳ **You can only change your password once every 15 minutes.**'));
    expect(mockConn.rollback).toHaveBeenCalled();
  });
});
