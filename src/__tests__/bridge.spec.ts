import initializeBridge from '../index';

it('initialize bridge', async () => {
    const bridge = await initializeBridge({ columns: 10, rows: 10 });
});