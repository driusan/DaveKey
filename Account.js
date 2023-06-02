import {useState,useEffect, createContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AccountContext = createContext(null);

export function useCalckeyAccount() {
  const [accessToken, setAccessToken] = useState(null);
  const [instance, setInstance] = useState('');
  const [accountInfo, setAccountInfo] = useState(null);
  useEffect(() => {
      AsyncStorage.multiGet(['@i', '@instance']).then(
        (vals) => {
            for(const obj of vals) {
                const [key, val] = obj;
                switch (key) {
                    case '@instance': setInstance(val); break;
                    case '@i': setAccessToken(val); break;
                }
            }
        }
      );
  }, []);
  useEffect(() => {
      // Fetch profile info after login
      if (!accessToken || !instance) {
          return;
      }
      const url = 'https://' + instance + "/api/i";
      fetch(url,
      {
          method: 'POST',
          headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          },
          credentials: "omit",
          body: JSON.stringify({i: accessToken})
      }).then(
        async (resp) => {
            const text = await resp.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                throw new Error("Response code for " + url + " was " + resp.status + " could not parse " + text);
            }
        }
      ).then( (json) => {
          if (json.error) {
              throw new Error(json);
          }
          setAccountInfo(json);
          console.log('Loaded', url);
      }).catch( (e) => {
          console.error('error loading ', url);
          console.error(e)
      });
  }, [instance, accessToken]);
  return {
      i: accessToken,
      instance: instance,
      accountInfo: accountInfo,
      mentionName: () => {
          if (!accountInfo) {
              return '';
          }
          return '@' + accountInfo.username + '@' + instance;
      },
      login: (i, instance) => {
          setInstance(instance);
          setAccessToken(i);
          AsyncStorage.setItem('@i', i);
          AsyncStorage.setItem('@instance', instance);
      },
      logout: () => {
          setAccessToken(null);
          setInstance('');
          AsyncStorage.removeItem('@i');
          AsyncStorage.removeItem('@instance');
      },
      api: (endpoint, params) => {
        if (!instance) {
            return new Promise( () => {});
            // throw new Error('No instance');
        }
        const url = 'https://' + instance + '/api/' + endpoint;
        const newParams = {
            i: accessToken, 
            ...params,
        };
        console.log('api', url);
        return fetch(url, {
          method: 'POST',
          headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          },
          credentials: "omit",
          body: JSON.stringify(newParams)
        }).then(
            async (resp) => {
                if (resp.status == 204) {
                    return {};
                }
                const text = await resp.text();
                try {
                    const json = JSON.parse(text);
                    if (!resp.ok) {
                        throw new Error('Received status code ' + resp.status + ' for ' + endpoint + ': ' + (json ? json.error : text));
                    }
                    return json;
                } catch (e) {
                    throw new Error('Received status code ' + resp.status + ' for ' + endpoint + ': ' + text);
                }
            }
        ).then(
            (json) => {
                if (json.error) {
                    throw new Error(json.error);
                }
                return json;
        });
    }
  };
}
