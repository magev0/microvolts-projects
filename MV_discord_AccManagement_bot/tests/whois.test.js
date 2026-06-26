const whoisCmd = require('../commands/whois');
const { query } = require('../db');

jest.mock('../db', () => ({
  query: jest.fn(),
}));

describe('whois command', () => {
  let interaction;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the Discord interaction object
    interaction = {
      user: { id: '123', username: 'TestUser' },
      options: {
        getUser: jest.fn().mockReturnValue(null) // target user (defaults to null, so it falls back to self)
      },
      deferReply: jest.fn().mockResolvedValue(true),
      editReply: jest.fn().mockResolvedValue(true),
    };
  });

  it('should tell the user if no account is found', async () => {
    query.mockResolvedValue([]); // Mock empty response

    await whoisCmd.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(query).toHaveBeenCalledWith(expect.any(String), ['123']);
    expect(interaction.editReply).toHaveBeenCalledWith(
      '❌ **TestUser** has no registered MicroVolts account.'
    );
  });

  it('should return formatted account info if accounts are found', async () => {
    const mockDate = new Date('2024-01-01T00:00:00Z');
    query.mockResolvedValue([
      { Nickname: 'Player1', Level: 10, Grade: 'Bronze', LinkedAt: mockDate }
    ]);

    await whoisCmd.execute(interaction);

    expect(interaction.deferReply).toHaveBeenCalledWith({ ephemeral: true });
    expect(query).toHaveBeenCalledWith(expect.any(String), ['123']);
    
    // Check if the reply contains the formatted account info
    const replyCall = interaction.editReply.mock.calls[0][0];
    expect(replyCall).toContain('🔍 **Account info for TestUser**');
    expect(replyCall).toContain('Player1');
    expect(replyCall).toContain('10');
    expect(replyCall).toContain('Bronze');
  });

  it('should handle database errors gracefully', async () => {
    // Suppress console.error in tests to keep output clean
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    query.mockRejectedValue(new Error('DB Error'));

    await whoisCmd.execute(interaction);

    expect(interaction.editReply).toHaveBeenCalledWith(
      '❌ A database error occurred. Please try again later.'
    );
    
    console.error.mockRestore();
  });
});
