import { useVisibleTask$, component$, useStore, Resource, useResource$ } from '@builder.io/qwik';
import { DocumentHead, server$ } from '@builder.io/qwik-city';
import { Link } from '@builder.io/qwik-city';
import { ElectrumWS, ElectrumWSEvent } from 'ws-electrumx-client';
import { hexToBin } from '@bitauth/libauth'
// import { LevelUtxoStore } from '../storage/level-storage'
import { openDB, deleteDB, wrap, unwrap, IDBPDatabase, DBSchema } from 'idb';


export async function getTokenUtxos(
  bchtestAddr: string
): Promise<UnspentUtxo['unspent']> {
  const electrum = new ElectrumWS('ws://0.0.0.0:50003');
  const addrtokenUtxo = await electrum.request<Promise<UnspentUtxo>>(
    'token.address.listunspent',
    bchtestAddr
  );
  return addrtokenUtxo.unspent
}



export default component$(() => {
  const utxoStore = useStore/* <TokenUtxo> */({
    addr: '',
    tokenData: ''
  })

  const blockResource = useResource$<Promise<TokenUtxo[]>>(async ({ track, cleanup }) => {
    let addr = 'bchtest:qrnnmmhltrt58vaxgemepdy5kqz36x9tqythdhar4a'
    // let addr = 'bchtest:qptnz3u8atavszhaqk037v0fjrtahxmsl5mm45u3pf'
    const tokenUtxos = await getTokenUtxos(addr)
    console.log(tokenUtxos)
    const tokenDataString = JSON.stringify(tokenUtxos)
    // utxoStore.height = blockHeaderResponse
    utxoStore.addr = addr
    utxoStore.tokenData = tokenDataString
    return tokenUtxos;

  });

  useVisibleTask$(async () => {
    const getUtxoDB = openDB('UTXO-STORE', 1, {
      upgrade(db) {
        db.createObjectStore('addr-utxo');
      },
    });

    const getKeys =
      async function keys() {
        return (await getUtxoDB).getAllKeys('addr-utxo');
      }
    const storeKeys = await getKeys()
    // const deleteDB = () => 
    const data: TokenUtxo = JSON.parse(utxoStore.tokenData)


    if ((await storeKeys).length == 0) {
      saveTokenUtxoStore(JSON.parse(utxoStore.tokenData), utxoStore.addr)
    }

    console.log(utxoStore.addr)
    console.log(storeKeys)
    if (storeKeys[0] !== utxoStore.addr) {
      del(storeKeys[0] as string)
      console.log(storeKeys[0] !== utxoStore.addr)
      // const addr = await storeKeys[0];
      saveTokenUtxoStore(JSON.parse(utxoStore.tokenData), utxoStore.addr)

    }

    async function del(addr: string) {
      const res = (await getUtxoDB).delete('addr-utxo', addr)
      console.log("DB DELETED", res)

    }
    async function getTokenDBUtxoStore(addr: string) {
      return (await getUtxoDB).get("addr-utxo", addr);
    }
    const IDBstore = await getTokenDBUtxoStore(utxoStore.addr)

  });
  return (
    <>

      <Resource
        value={blockResource}
        onPending={() => <div>Loading...</div>}
        // onRejected={(reason) => <div>Error: {reason}</div>}
        onResolved={(item) => (
          <div>
            {
                 //@ts-ignore
            item.map((e) => (
              <div class='card' >
                <p>Height: {e.height}</p>
                <p class='token-id' >Token ID: {e.token_id}</p>
                <p>Token Amount: {e.token_amount}</p>
                <p class='tx-hash' >TX Hash: {e.tx_hash}</p>
                <p>TX Pos: {e.tx_pos}</p>
                <p>Value: {e.value}</p>
              </div>
            ))}
          </div>
        )}
      />
    </>
  )
});


export const head: DocumentHead = {
  title: 'Welcome to Qwik',
  meta: [
    {
      name: 'description',
      content: 'Qwik site description',
    },
  ],
};


// export async function demo(tokenData:any,tx_hash:TokenUtxo['tx_hash']) {
export async function saveTokenUtxoStore(tokenData: any, addr: string) {
  const db = await openDB<TokenUtxoDB>('UTXO-STORE', 1, {
    upgrade(db) {
      db.createObjectStore('addr-utxo');
      // const utxoStore = db.createObjectStore('utxos', {
      //   keyPath: "tx_hash",
      // });
      // utxoStore.createIndex('hash', 'tx_hash');
    },
  });

  await db.put('addr-utxo', tokenData, addr);

}

export interface UnspentUtxo {
  unspent:TokenUtxo[]
}

/* export interface UnspentUtxoDB extends DBSchema {
  'addr': {
    key: string;
    value: TokenUtxo[];
  };
} */
export interface TokenUtxo {
  height: number,
  token_amount: number,
  token_id: string,
  tx_hash: string,
  tx_pos: number,
  value: number
}

export interface TokenUtxoDB extends DBSchema {
  'addr-utxo': {
    key: string;
    value: TokenUtxo[];
  };
/*   utxos: {
    value: TokenUtxo;
    key: string;
    indexes: { 'hash': TokenUtxo["tx_hash"] };
  }; */
}