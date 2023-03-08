import {
  createSlice,
  createEntityAdapter,
  type Slice,
  type SliceCaseReducers,
  type EntityAdapter,
  type EntityState,
  type EntitySelectors,
  type PayloadAction
} from '@reduxjs/toolkit';
import type { DownloadItem } from '../types';
import type { MessageEventData } from '../Download/function/downloadBilibiliVideo.worker/downloadBilibiliVideo.worker';

// 下载列表
export const bilibiliDownloadListAdapter: EntityAdapter<DownloadItem> = createEntityAdapter({
  selectId: (item: DownloadItem): string => item.qid
});
export const bilibiliDownloadListSelectors: EntitySelectors<DownloadItem, EntityState<DownloadItem>>
  = bilibiliDownloadListAdapter.getSelectors();

export interface BilibiliDownloadInitialState extends EntityState<DownloadItem> {
  downloadProgress: { [key: string]: number };
}

type CaseReducers = SliceCaseReducers<BilibiliDownloadInitialState>;

const { actions, reducer }: Slice = createSlice<BilibiliDownloadInitialState, CaseReducers, 'bilibiliDownload'>({
  name: 'bilibiliDownload',
  initialState: bilibiliDownloadListAdapter.getInitialState({
    downloadProgress: {} // 下载进度
  }),
  reducers: {
    setAddDownloadList: bilibiliDownloadListAdapter.addOne,       // 添加下载
    setDeleteDownloadList: bilibiliDownloadListAdapter.removeOne, // 删除下载

    // 设置下载进度
    setDownloadProgress(state: BilibiliDownloadInitialState, action: PayloadAction<MessageEventData>): void {
      const { type, qid, data }: MessageEventData = action.payload;

      if (type === 'progress') {
        state.downloadProgress[qid] = data;
      } else if (type === 'success') {
        delete state.downloadProgress[qid]; // 下载完成
      }

      state.downloadProgress = { ...state.downloadProgress };
    }
  }
});

export const {
  setAddDownloadList,
  setDeleteDownloadList,
  setDownloadProgress
}: Record<string, Function> = actions;
export default { bilibiliDownload: reducer };