import type { Dispatch as D, SetStateAction as S } from 'react';
import type { MessageInstance } from 'antd/es/message/interface';

type noProtocolUrl = `//${ string }`;

export interface AwemeDetail {
  desc: string; // 标题
  download: {
    prevent?: boolean;
    url?: string; // 有水印
  };
  video: {
    bitRateList: Array<{
      playApi: noProtocolUrl;
      playAddr: Array<{
        src: noProtocolUrl;
      }>;
    }>;
    playAddr: Array<{
      src: noProtocolUrl;
    }>;
    playApi: noProtocolUrl; // 无水印
  };
}

export interface C0Obj {
  odin: object;
  user: object;
}

export interface CVersionObj {
  aweme: {
    detail: AwemeDetail;
  };
}

export interface ScriptRendedData {
  _location: string;
  C_0: C0Obj;
  [key: `c_${ number }`]: CVersionObj;
}

export interface DownloadUrlItem {
  value: string;
  label: string;
}

/* 下载相关 */
export interface DownloadItem {
  qid: string;   // 当前的下载id，随机
  url: string;   // 下载地址
  title: string; // 视频标题
}

/* 解析头条验证码 */
export interface GetVideoUrlOnionContext {
  messageApi: MessageInstance;
  html?: string;
  fp?: `verify_${ string }`;
  cookie?: string;
  type?: 'video' | 'user';
  value: string;
  id?: string;
  setUrlLoading: D<S<boolean>>;
  setVisible: D<S<boolean>>;
  setDownloadUrl: D<S<DownloadUrlItem[]>>;
  setTitle: D<S<string>>;
}

export interface VerifyData {
  code: string;
  detail: string;
  fp: `verify_${ string }`;
  from: string;
  region: string;
  server_sdk_env: string;
  subtype: 'slide';
  type: 'verify';
  verify_event: string;
  version: string;
}