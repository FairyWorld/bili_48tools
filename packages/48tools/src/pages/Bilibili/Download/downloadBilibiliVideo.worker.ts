import { promisify } from 'util';
import { pipeline } from 'stream';
import * as fs from 'fs';
import got from 'got';
import type { ProgressEventData } from '../types';

const pipelineP: (stream1: NodeJS.ReadableStream, stream2: NodeJS.WritableStream) => Promise<void> = promisify(pipeline);

type WorkerEventData = {
  type: 'start';
  filePath: string;
  durl: string;
  qid: string;
};

export type MessageEventData = {
  type: 'success' | 'progress';
  qid: string;
  data: number;
};

/**
 * 下载文件
 * @param { string } fileUrl: 文件url地址
 * @param { string } filename: 文件本地地址
 * @param { (e: ProgressEventData) => void } onProgress: 进度条
 */
async function requestDownloadFileByStream(
  fileUrl: string,
  filename: string,
  onProgress: (e: ProgressEventData) => void
): Promise<void> {
  await pipelineP(
    got.stream(fileUrl, {
      headers: {
        referer: 'https://www.bilibili.com/'
      }
    }).on('downloadProgress', onProgress),
    fs.createWriteStream(filename)
  );
}

/**
 * 下载视频或者音频
 * @param { string } qid: qid
 * @param { string } durl: 文件的网络地址
 * @param { string } filePath: 保存位置
 */
function download(qid: string, durl: string, filePath: string): void {
  requestDownloadFileByStream(durl, filePath, function(e: ProgressEventData): void {
    if (e.percent >= 1) {
      // @ts-ignore
      postMessage({ type: 'success', qid });
    } else {
      // @ts-ignore
      postMessage({
        type: 'progress',
        data: Math.floor(e.percent * 100),
        qid
      });
    }
  });
}

addEventListener('message', function(event: MessageEvent<WorkerEventData>): void {
  const { type, filePath, durl, qid }: WorkerEventData = event.data;

  if (type === 'start') {
    download(qid, durl, filePath);
  }
});