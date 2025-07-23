import { useLoggerStore } from './store-logger';
import { StreamingLog } from '../types';

describe('useLoggerStore', () => {
  beforeEach(() => {
    useLoggerStore.getState().clearLogs();
  });

  it('should add a new log to the store', () => {
    const log: StreamingLog = {
      date: new Date(),
      type: 'client.send',
      message: 'Hello, world!',
    };
    useLoggerStore.getState().log(log);
    expect(useLoggerStore.getState().logs).toHaveLength(1);
    expect(useLoggerStore.getState().logs[0]).toEqual(log);
  });

  it('should not add a new log if it is the same as the previous one', () => {
    const log: StreamingLog = {
      date: new Date(),
      type: 'client.send',
      message: 'Hello, world!',
    };
    useLoggerStore.getState().log(log);
    useLoggerStore.getState().log(log);
    expect(useLoggerStore.getState().logs).toHaveLength(1);
    expect(useLoggerStore.getState().logs[0].count).toBe(1);
  });

  it('should truncate the logs when the maxLogs limit is reached', () => {
    useLoggerStore.getState().setMaxLogs(2);
    const log1: StreamingLog = {
      date: new Date(),
      type: 'client.send',
      message: 'Log 1',
    };
    const log2: StreamingLog = {
      date: new Date(),
      type: 'client.send',
      message: 'Log 2',
    };
    const log3: StreamingLog = {
      date: new Date(),
      type: 'client.send',
      message: 'Log 3',
    };
    useLoggerStore.getState().log(log1);
    useLoggerStore.getState().log(log2);
    useLoggerStore.getState().log(log3);
    expect(useLoggerStore.getState().logs).toHaveLength(2);
    expect(useLoggerStore.getState().logs[0]).toEqual(log2);
    expect(useLoggerStore.getState().logs[1]).toEqual(log3);
  });
});
