export interface Block {
  height: number
  timestamp: number
  reward?: number
  diff: number
  weave_size: number
}

export interface BlockHeightHash {
  [height: number]: Block
}
