export type Language = 'en' | 'si';

export const translations = {
  en: {
    // Game results
    youWon: 'You Won',
    youLost: 'You Lost',
    betPlaced: 'Bet Placed Successfully',
    gameResult: 'Game Result',
    winAmount: 'Win Amount',
    lossAmount: 'Loss Amount',
    
    // Betting
    placeBet: 'Place Bet',
    betAmount: 'Bet Amount',
    selectNumber: 'Select Number',
    selectColor: 'Select Color',
    
    // Colors
    green: 'Green',
    red: 'Red',
    violet: 'Violet',
    
    // Numbers
    big: 'Big',
    small: 'Small',
    
    // Transactions
    deposit: 'Deposit',
    withdrawal: 'Withdrawal',
    success: 'Success',
    failed: 'Failed',
    pending: 'Pending',
    
    // Notifications
    balanceUpdated: 'Balance Updated',
    insufficientBalance: 'Insufficient Balance',
    betSuccess: 'Bet placed successfully',
    betFailed: 'Failed to place bet',
    
    // Account
    balance: 'Balance',
    totalWin: 'Total Win',
    totalLoss: 'Total Loss',
    
    // Game status
    betting: 'Betting',
    waiting: 'Waiting for Result',
    result: 'Result',
  },
  si: {
    // Game results - සිංහල
    youWon: 'ඔබ ජයග්‍රහණය කළා',
    youLost: 'ඔබට අහිමි වුණා',
    betPlaced: 'ඔට්ටුව සාර්ථකව තැබුණා',
    gameResult: 'ක්‍රීඩා ප්‍රතිඵලය',
    winAmount: 'ජයග්‍රහණ මුදල',
    lossAmount: 'අහිමි වූ මුදල',
    
    // Betting - ඔට්ටු ඇල්ලීම
    placeBet: 'ඔට්ටුව තබන්න',
    betAmount: 'ඔට්ටු මුදල',
    selectNumber: 'අංකය තෝරන්න',
    selectColor: 'වර්ණය තෝරන්න',
    
    // Colors - වර්ණ
    green: 'කොළ',
    red: 'රතු',
    violet: 'දම්',
    
    // Numbers - අංක
    big: 'විශාල',
    small: 'කුඩා',
    
    // Transactions - ගනුදෙනු
    deposit: 'තැන්පත් කිරීම',
    withdrawal: 'මුදල් ගැනීම',
    success: 'සාර්ථකයි',
    failed: 'අසාර්ථකයි',
    pending: 'පොරොත්තු',
    
    // Notifications - දැනුම්දීම්
    balanceUpdated: 'ශේෂය යාවත්කාලීන කළා',
    insufficientBalance: 'ප්‍රමාණවත් ශේෂයක් නැහැ',
    betSuccess: 'ඔට්ටුව සාර්ථකව තැබුණා',
    betFailed: 'ඔට්ටුව තැබීම අසාර්ථකයි',
    
    // Account - ගිණුම
    balance: 'ශේෂය',
    totalWin: 'මුළු ජයග්‍රහණ',
    totalLoss: 'මුළු පාඩු',
    
    // Game status - ක්‍රීඩා තත්වය
    betting: 'ඔට්ටු ඇල්ලීම',
    waiting: 'ප්‍රතිඵලය බලාපොරොත්තුවෙන්',
    result: 'ප්‍රතිඵලය',
  },
};

export function useTranslation(lang: Language = 'en') {
  return {
    t: (key: keyof typeof translations.en) => {
      return translations[lang][key] || translations.en[key];
    },
    lang,
  };
}

export function getTranslation(key: keyof typeof translations.en, lang: Language = 'en') {
  return translations[lang][key] || translations.en[key];
}
