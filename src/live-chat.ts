import {EventEmitter} from 'events'
import axios from 'axios'
import {CommentItem, parseData} from './parser'
import {getparam} from './paramgen'
/**
 * YouTubeライブチャット取得イベント
 */
export class LiveChat extends EventEmitter {
  private static readonly headers = {'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3770.142 Safari/537.36'}
  public readonly channelId?: string
  public liveId?: string
  private observer?: NodeJS.Timeout
  private continuation?: string = "unacquired"
  private timeout = 0.0
  constructor(options: {channelId: string} | {liveId: string}, private interval = 5000) {
    super()
    if ('channelId' in options) {
      this.channelId = options.channelId
    } else if ('liveId' in options) {
      this.liveId = options.liveId
    } else {
      throw TypeError("Required channelId or liveId.")
    }
  }

  public async start(): Promise<boolean> {
    if (this.channelId) {
      const liveRes = await axios.get(
        `https://www.youtube.com/channel/${this.channelId}/live`, 
        {headers: LiveChat.headers})
      if (liveRes.data.match(/LIVE_STREAM_OFFLINE/)) {
        this.emit('error', new Error("Live stream offline"))
        return false
      }
      this.liveId = liveRes.data.match(
        /<meta property="og:image" content="https:\/\/i\.ytimg\.com\/vi\/([^\/]*)\//)[1] as string
    }

    if (!this.liveId) {
      this.emit('error', new Error('Live stream not found'))
      return false
    }
    await this.fetchChat()
    //this.emit('start', this.liveId)
    return true
  }

  public stop(reason?: string) {
    if (this.observer) {
      clearInterval(this.observer)
      this.emit('end', reason)
    }
  }

  private async fetchChat() {

    if (this.continuation === "unacquired"){
        this.continuation = getparam(this.liveId)
    }
    while(this.continuation){
      const res = await axios.get(
        `https://www.youtube.com/live_chat/get_live_chat?continuation=${this.continuation}&pbj=1`,
        { headers: LiveChat.headers });
      if(res.data.response.responseContext.errors) {
        this.stop("Invalid liveID or live is private/deleted.")  
      }
      const contents = res.data.response.continuationContents
      if (contents == null) {
        this.stop("Live stream is finished")
      return
      }
      //parse livechat json
      const lcc = res.data.response.continuationContents.liveChatContinuation
      const cont = lcc.continuations[0]
      const metadata = cont.invalidationContinuationData || 
                      cont.timedContinuationData || 
                      cont.reloadContinuationData;
      this.continuation = metadata.continuation
      this.timeout = metadata.timeoutMs
      const items = lcc.actions
      //parse chat data
      let v:Action 
      if (items != null) {
        for (v of items){
          let p = parseData(v)
          if (p != null) {
            this.emit('comment', p)
            await this.sleep(this.timeout/items.length)
          }
        }
      }
    }
    this.stop("Live stream is finished")
   
  }

  private  sleep = (msec:number) => new Promise(resolve => setTimeout(resolve, msec));

  public on(event: 'comment', listener: (comment: CommentItem) => void): this
  public on(event: 'start', listener: (liveId: string) => void): this
  public on(event: 'end', listener: (reason?: string) => void): this
  public on(event: 'error', listener: (err: Error) => void): this
  public on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener)
  }
}
