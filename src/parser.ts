interface ImageItem {
  url: string
  alt: string
  width: number
  height: number
}

type MessageItem = { text: string } | ImageItem

export interface CommentItem {
  id: string
  author: {
    name: string
    thumbnail?: ImageItem
    channelId: string
    badge?: {
      thumbnail: ImageItem
      label: string
    }
  }
  message: MessageItem[]
  superchat?: {
    amount: string
    color: number
  }
  membership: boolean
  isOwner: boolean
  timestamp: number
}


function parseThumbnailToImageItem(data: Thumbnail[], alt: string): ImageItem | undefined {
  const thumbnail = data.pop()
  if (thumbnail) {
    return {
      url: thumbnail.url,
      width: thumbnail.width!,
      height: thumbnail.height!,
      alt: alt,
    }
  }
  return
}

function parseEmojiToImageItem(data: MessageEmoji): ImageItem | undefined {
  return parseThumbnailToImageItem(data.emoji.image.thumbnails, data.emoji.shortcuts.shift()!)
}

function parseMessages(runs: MessageRun[]): MessageItem[] {
  return runs.map((run: MessageRun) => {
    if ('text' in run) {
      return run
    } else {
      return parseEmojiToImageItem(run)!
    }
  })
}

export function actionToRenderer(action: Action): LiveChatTextMessageRenderer | LiveChatPaidMessageRenderer | LiveChatPaidStickerRenderer | LiveChatMembershipItemRenderer | null {
  if (!action.addChatItemAction) {
    return null
  }
  const item = action.addChatItemAction.item
  if (item.liveChatTextMessageRenderer) {
    return item.liveChatTextMessageRenderer
  } else if (item.liveChatPaidMessageRenderer) {
    return item.liveChatPaidMessageRenderer
  } else if (item.liveChatPaidStickerRenderer) {
    return item.liveChatPaidStickerRenderer
  } else if (item.liveChatMembershipItemRenderer){
    return item.liveChatMembershipItemRenderer
  } else 
    return null
}

export function usecToTime(usec: string): number {
  return Math.floor(Number(usec) / 1000)
}

export function parseData(data: Action): CommentItem | null {
  const messageRenderer = actionToRenderer(data)
  if (messageRenderer == null) { return null }
  const message = 'message' in messageRenderer ? messageRenderer.message.runs : messageRenderer.headerSubtext.runs

  const ret: CommentItem = {
    id: messageRenderer.id,
    author: {
      name: messageRenderer.authorName.simpleText,
      thumbnail: parseThumbnailToImageItem(messageRenderer.authorPhoto.thumbnails, messageRenderer.authorName.simpleText),
      channelId: messageRenderer.authorExternalChannelId,
    },
    message: parseMessages(message),
    membership: Boolean('headerSubtext' in messageRenderer),
    isOwner: false,
    timestamp: usecToTime(messageRenderer.timestampUsec),
  }

  if (messageRenderer.authorBadges) {
    const badge = messageRenderer.authorBadges[0].liveChatAuthorBadgeRenderer
    if (badge.customThumbnail) {
      ret.author.badge = {
        thumbnail: parseThumbnailToImageItem(badge.customThumbnail.thumbnails, badge.tooltip)!,
        label: badge.tooltip,
      }
    } else {
      ret.isOwner = true
    }
  }
  
  if ('moneyChipTextColor' in messageRenderer) {
    ret.superchat = {
      amount: messageRenderer.purchaseAmountText.simpleText,
      color: messageRenderer.backgroundColor,
    }
  } else if ('purchaseAmountText' in messageRenderer) {
    ret.superchat = {
      amount: messageRenderer.purchaseAmountText.simpleText,
      color: messageRenderer.bodyBackgroundColor,
    }
  }

  return ret
}