// Create manual mocks FIRST
const mockPlayer = {
  getDailyPlaytimeCounter: jest.fn()
};

const mockMemoryLoader = {
  getItems: jest.fn()
};

const mockGiftBox = {
  sendReward: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock the modules BEFORE requiring the service
jest.doMock('../database/Player', () => mockPlayer);
jest.doMock('../util/MemoryLoader', () => mockMemoryLoader);
jest.doMock('../services/GiftBoxService', () => mockGiftBox);
jest.doMock('../util/logger', () => ({ logger: mockLogger }));

// Now require the service AFTER setting up mocks
const DailyPlayTimeService = require('../services/DailyPlayTimeService');

describe('DailyPlayTimeService', () => {
  let service;
  const mockPlayerId = 'player123';
  const mockPlayerNickname = 'TestPlayer';
  const mockItemPool = [
    { itemName: 'Anesidora ChestPlate (legendary)', itemOption: 'Speed', itemId: 1132100, dropRate: 0.002 },
    { itemName: 'Gold Rifle (rare)', itemOption: 'NA', itemId: 1140001, dropRate: 0.001 },
    { itemName: 'MP Pepper (common)', itemOption: 'NA', itemId: 1140001, dropRate: 0.01 }
  ];

  describe('constructor', () => {
    let service;
    beforeEach(() => {
      service = new DailyPlayTimeService(mockPlayerId, mockPlayerNickname);
    });
  
    it('should initialize with correct values including nickname', () => {
      expect(service.playerId).toBe(mockPlayerId);
      expect(service.playernickname).toBe(mockPlayerNickname);
      expect(service.requiredPlaytimeInSeconds).toBe(7200);
    });
  });
  // Set up environment variable
  process.env.DAILY_PLAYTIME_DRAW_TRIGGER =2;

  // Setup MemoryLoader mock to return our test item pool
  mockMemoryLoader.getItems.mockReturnValue(mockItemPool);

  // Create fresh service instance for each test
  service = new DailyPlayTimeService(mockPlayerId, mockPlayerNickname);
  describe('dropItem', () => {
    it('should return item when pool has items', () => {
      // Mock Math.random to select first item (Anesidora ChestPlate (legendary))
      jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0)  // First call → rand = 0 → selects first item
      .mockReturnValueOnce(0); 

      const result = service.dropItem(mockItemPool);

      expect(result).toEqual({
        droppedItemName: 'Anesidora ChestPlate (legendary)',
        droppedItemId: 1132100
      });

      Math.random.mockRestore();
    });

    it('should return null when pool is empty', () => {
      const result = service.dropItem([]);

      expect(result).toEqual(null);
    });

    it('should select rare item (Gold Rifle) deterministically', () => {
      // Calculate random that falls inside Gold Rifle range
      const totalWeight = mockItemPool.reduce((sum, item) => sum + item.dropRate, 0);

      // Cumulative start for Gold Rifle (previous items)
      const goldRifleStart = mockItemPool[0].dropRate; // 0.002
      // Cumulative end for Gold Rifle
      const goldRifleEnd = goldRifleStart + mockItemPool[1].dropRate; // 0.003
      
      // Pick a value in the middle of Gold Rifle's weight range
      const randomValueForGoldRifle = (goldRifleStart + goldRifleEnd) / 2; // **no division by totalWeight**
      jest.spyOn(Math, 'random').mockReturnValueOnce(randomValueForGoldRifle / totalWeight);    
      const result = service.dropItem(mockItemPool);
    
      expect(result.droppedItemName).toBe('Gold Rifle (rare)');
      expect(result.droppedItemId).toBe(1140001);
    
      Math.random.mockRestore();
    });
    

    it('should handle zero drop rates', () => {
      const zeroRatePool = [
        { itemId: ['item1'], dropRate: 0, itemName: 'No Drop' }
      ];

      const result = service.dropItem(zeroRatePool);

      expect(result).toEqual(null);
    });
  });

  describe('dropItem', () => {
    it('should return item when pool has items', () => {
      jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0) // For weighted selection
        .mockReturnValueOnce(0); // For item ID selection

      const result = service.dropItem(mockItemPool);

      expect(result).toEqual({
        droppedItemName: 'Anesidora ChestPlate (legendary)',
        droppedItemId: 1132100
      });

      Math.random.mockRestore();
    });

    it('should return null when pool is empty', () => {
      const result = service.dropItem([]);

      expect(result).toEqual(null);
  });

  it('should handle zero drop rates', () => {
    const zeroRatePool = [
      { itemId: ['item1'], dropRate: 0, itemName: 'No Drop' }
    ];

    const result = service.dropItem(zeroRatePool);

    expect(result).toEqual(null);
  });
});

describe('draw', () => {
  it('should return dropped item when eligible', async () => {
    mockPlayer.getDailyPlaytimeCounter.mockResolvedValue({ twoHoursCounter: 7200 });
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    const result = await service.draw();

    expect(result).toEqual({
      droppedItemName: 'Anesidora ChestPlate (legendary)',
      droppedItemId: 1132100
    });

    Math.random.mockRestore();
  });

  it('should return null when not eligible', async () => {
    mockPlayer.getDailyPlaytimeCounter.mockResolvedValue({ twoHoursCounter: 1000 });

    const result = await service.draw();

    expect(result).toBeNull();
    expect(mockLogger.warn).toHaveBeenCalledWith('Not enough playtime to draw');
  });

  it('should return null when drop fails', async () => {
    mockPlayer.getDailyPlaytimeCounter.mockResolvedValue(7200);
    // Mock empty pool to cause drop failure
    service.itemPool = [];

    const result = await service.draw();

    expect(result).toBeNull();
  });
});

describe('getProgression', () => {
  it('should return progression data', async () => {
    mockPlayer.getDailyPlaytimeCounter.mockResolvedValue({ twoHoursCounter: 3600 });

    const result = await service.getProgression();

    expect(result).toEqual({
      canDraw: false,
      progress: 50
    });
  });
});

describe('claimReward', () => {
  it('should call GiftBox with correct parameters', async () => {
    const rewardItem = {
      droppedItemName: 'Test Item',
      droppedItemId: 'item1'
    };

    await service.claimReward(rewardItem, mockPlayerNickname);

    expect(mockGiftBox.sendReward).toHaveBeenCalledWith(
      rewardItem,
      mockPlayerId,
      mockPlayerNickname,
      'Daily Playtime Reward',
      'ChestSys'  // Fixed: Use correct parameter
    );
  });

  it('should handle GiftBox service errors', async () => {
    const rewardItem = {
      droppedItemName: 'Test Item',
      droppedItemId: 'item1'
    };
    const giftBoxError = new Error('Gift service unavailable');
    mockGiftBox.sendReward.mockRejectedValue(giftBoxError);

    await expect(service.claimReward(rewardItem, mockPlayerNickname)).rejects.toThrow(
      'Gift service unavailable'
    );
  });
});

describe('integration scenarios', () => {
  it('should complete full draw and claim flow', async () => {
    // Setup: Player eligible to draw
    mockPlayer.getDailyPlaytimeCounter.mockResolvedValue({twoHoursCounter: 7200});
    jest.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0);

    // Act: Draw item
    const droppedItem = await service.draw();

    // Assert: Item was dropped
    expect(droppedItem).toEqual({
      droppedItemName: 'Anesidora ChestPlate (legendary)',
      droppedItemId: 1132100
    });

    // Act: Claim reward
    await service.claimReward(droppedItem, mockPlayerNickname);

    // Assert: Reward was sent
    expect(mockGiftBox.sendReward).toHaveBeenCalledWith(
      droppedItem,
      mockPlayerId,
      mockPlayerNickname,
      'Daily Playtime Reward',
      'ChestSys'
    );

    Math.random.mockRestore();
  });
});
});

describe('constructor', () => {
  let service;
  it('should initialize with correct values including nickname', () => {
    expect(service.playerId).toBe(mockPlayerId);
    expect(service.playernickname).toBe(mockPlayerNickname);
    expect(service.requiredPlaytimeInSeconds).toBe(7200); // 2 * 3600
    expect(service.itemPool).toEqual(mockItemPool);
    expect(mockMemoryLoader.getItems).toHaveBeenCalledWith('playtime_draw_data');
  });
});

describe('checkEligibility', () => {
  let service;
  it('should calculate progress correctly when not eligible', async () => {
    // Player has 3600 seconds (1 hour), needs 7200 (2 hours)

    mockPlayer.getDailyPlaytimeCounter.mockResolvedValue({ twoHoursCounter: 3600 });

    const result = await service.checkEligibility();

    expect(result).toEqual({
      canDraw: false,
      progress: 50 // (3600 / 7200) * 100 = 50%
    });
  });
})


