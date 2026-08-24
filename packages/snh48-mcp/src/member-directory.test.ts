import { describe, expect, test } from '@jest/globals';
import { MemberDirectory } from './member-directory';

describe('MemberDirectory', (): void => {
  test('默认搜索 SNH48，并支持姓名、拼音和房间 ID', async (): Promise<void> => {
    const calls: string[] = [];
    const directory: MemberDirectory = new MemberDirectory({
      fetchJson: async (url: string): Promise<unknown> => {
        calls.push(url);

        await Promise.resolve();

        return {
          buildTime: '2026-08-24',
          roomId: [
            {
              id: 1,
              ownerName: '张三',
              groupName: 'SNH48',
              pinyin: 'zhangsan',
              roomId: '1001'
            },
            {
              id: 2,
              ownerName: '李四',
              groupName: 'BEJ48',
              pinyin: 'lisi',
              roomId: '2002'
            }
          ]
        };
      }
    });

    const result: Awaited<ReturnType<MemberDirectory['search']>> = await directory.search('zhangsan');

    expect(result.group).toBe('SNH48');
    expect(result.total).toBe(1);
    expect(result.items[0]?.name).toBe('张三');
    expect(calls).toHaveLength(1);
  });

  test('all 分组可以跨团搜索，并限制返回条数', async (): Promise<void> => {
    const directory: MemberDirectory = new MemberDirectory({
      fetchJson: async (): Promise<unknown> => {
        await Promise.resolve();

        return {
          roomId: [
            { id: 1, ownerName: '甲', groupName: 'SNH48', pinyin: 'same' },
            { id: 2, ownerName: '乙', groupName: 'BEJ48', pinyin: 'same' },
            { id: 3, ownerName: '丙', groupName: 'GNZ48', pinyin: 'same' }
          ],
          buildTime: 'test'
        };
      }
    });

    const result: Awaited<ReturnType<MemberDirectory['search']>> = await directory.search('same', 'all', 2);

    expect(result.group).toBe('all');
    expect(result.total).toBe(3);
    expect(result.items).toHaveLength(2);
  });

  test('缓存有效期内只请求一次，主地址失败时使用备用地址', async (): Promise<void> => {
    const calls: string[] = [];
    const directory: MemberDirectory = new MemberDirectory({
      urls: ['primary', 'fallback'],
      fetchJson: async (url: string): Promise<unknown> => {
        calls.push(url);

        await Promise.resolve();

        if (url === 'primary') {
          throw new Error('mock failure');
        }

        return {
          roomId: [{ id: 1, ownerName: '成员', groupName: 'SNH48', pinyin: 'member' }],
          buildTime: 'test'
        };
      }
    });

    await directory.load();
    await directory.load();

    expect(calls).toEqual(['primary', 'fallback']);
  });
});
