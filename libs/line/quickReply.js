const participate = {
  type: 'action',
  // https://www.flaticon.com/free-icon/raise-hand_927379#term=raise&page=1&position=38
  imageUrl: 'https://s3-ap-northeast-1.amazonaws.com/drawing-telephone-game-linebot-assets/raise-hand.png',
  action: {
    type: 'message',
    label: '参加',
    text: '参加',
  },
};

const start = {
  type: 'action',
  // https://www.flaticon.com/free-icon/play-button_109197#term=play&page=1&position=18
  imageUrl: 'https://s3-ap-northeast-1.amazonaws.com/drawing-telephone-game-linebot-assets/play-button.png',
  action: {
    type: 'message',
    label: '開始',
    text: '開始',
  },
};

const end = {
  type: 'action',
  // https://www.flaticon.com/free-icon/stop_148745#term=stop&page=1&position=3
  imageUrl: 'https://s3-ap-northeast-1.amazonaws.com/drawing-telephone-game-linebot-assets/stop.png',
  action: {
    type: 'message',
    label: '終了',
    text: '終了',
  },
};

const help = {
  type: 'action',
  // https://www.flaticon.com/free-icon/stop_148745#term=stop&page=1&position=3
  imageUrl: 'https://s3-ap-northeast-1.amazonaws.com/drawing-telephone-game-linebot-assets/information.png',
  action: {
    type: 'message',
    label: 'ヘルプ',
    text: 'ヘルプ',
  },
};

const skip = {
  type: 'action',
  // https://www.flaticon.com/free-icon/remove-user_97878#term=remove%20user&page=1&position=35
  imageUrl: 'https://s3-ap-northeast-1.amazonaws.com/drawing-telephone-game-linebot-assets/remove-user.png',
  action: {
    type: 'message',
    label: 'スキップ',
    text: 'スキップ',
  },
};

const next = {
  type: 'action',
  // https://www.flaticon.com/free-icon/next_126469#term=next&page=1&position=4
  imageUrl: 'https://s3-ap-northeast-1.amazonaws.com/drawing-telephone-game-linebot-assets/next.png',
  action: {
    type: 'message',
    label: '次へ',
    text: '次へ',
  },
};

const announce = {
  type: 'action',
  // https://www.flaticon.com/free-icon/loudspeaker_1152956#term=announce&page=1&position=15
  imageUrl: 'https://s3-ap-northeast-1.amazonaws.com/drawing-telephone-game-linebot-assets/loudspeaker.png',
  action: {
    type: 'message',
    label: '結果発表',
    text: '結果発表',
  },
};

module.exports = {
  participate,
  start,
  end,
  help,
  skip,
  next,
  announce,
};
