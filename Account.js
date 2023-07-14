import {useRef, useCallback, useState,useEffect, createContext } from 'react';
import {Alert, ToastAndroid} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as DocumentPicker from 'expo-document-picker';

export const AccountContext = createContext(null);

function websocketMessageHandler(timelineCB) {
    return (e) => {
          // FIXME: Delegate appropriately
          // channels are documented at https://misskey-hub.net/en/docs/api/streaming/channel/
          console.log('message', e.data);
          const body = JSON.parse(e.data).body;
          console.log('message', e.data);
          if (body.id === 'mainChannel') {
              console.log('body', body);
              switch(body.type) {
              case 'unreadNotification':
                // FIXME: Increase count in sidebar
                ToastAndroid.show('New notification', ToastAndroid.SHORT);
                break;
              case 'readAllNotifications':
                // FIXME: Set count in sidebar
              }
          } else if (body.id === 'timelineChannel') {
              console.log('msg on timeline', body.body, 'cb', timelineCB);
              if (timelineCB) {
                  timelineCB(body.body);
              }
          }
  }
}

export function useWebSocket(instance, token) {
  const ws = useRef(null);
  useEffect( () => {
      if (!instance || !token) {
          return;
      }
      console.log('Creating websocket connection');
      if (!ws.current) {
          ws.current = new WebSocket("wss://" + instance + "/streaming?i=" + token);
      }

      ws.current.onopen = () => {
        ws.current.send(JSON.stringify({
          type: 'connect',
          body: {
            'channel': 'main',
            'id': 'mainChannel',
          }
        }));
      };
      ws.current.onmessage = websocketMessageHandler();
      ws.current.onerror = (e) => {
          console.error(e.message);
      }
      ws.current.onclose = (e) => {
          console.log(e.code, e.reason);
      }
      const wsCurrent = ws.current;
      return () => {
          if (wsCurrent) {
              wsCurrent.close();
        }
      }
  }, [instance, token]);
  return ws.current;
} 
export function useCalckeyAccount() {
  const [lastUpload, setLastUpload] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [instance, setInstance] = useState('');
  const [accountInfo, setAccountInfo] = useState(null);
  useEffect(() => {
      SecureStore.getItemAsync('i').then( (val) => {
          setAccessToken(val);
      });
      SecureStore.getItemAsync('instance').then( (val) => {
          setInstance(val);
      });
  }, []);
  const socket = useWebSocket(instance, accessToken);
  useEffect( () => {
    if (!socket) {
        console.log('Socket not connected');
        return;
    }
    console.log('Connecting to main');

    socket.addEventListener('message', (e) => {
          // channels are documented at https://misskey-hub.net/en/docs/api/streaming/channel/
          const body = JSON.parse(e.data).body;
          if (body.id === 'mainChannel') {
              console.log('body', body);
              switch(body.type) {
              case 'unreadNotification':
                // FIXME: Increase count in sidebar
                ToastAndroid.show('New notification', ToastAndroid.SHORT);
                break;
              case 'readAllNotifications':
                // FIXME: Set count in sidebar
              }
          } 
    });
  }, [socket]);
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
  const api = (endpoint, params) => {
        if (!instance) {
            return new Promise( () => {});
            // throw new Error('No instance');
        }
        const url = 'https://' + instance + '/api/' + endpoint;
        const newParams = {
            i: accessToken, 
            ...params,
        };
        const headers = {
          Accept: 'application/json',
        };
        let body;
        // We need to post differently depending on if the endpoint is
        // expecting JSON or multipart/form-data
        switch (endpoint) {
            case 'drive/files/create':
                // Do not set content type, it's handled by FormData
                body = new FormData();
                console.log(newParams);
                for (const element in newParams) {
                    console.log(element);
                    body.append(element, newParams[element]);
                }
                break;
            default:
              // Assume it's JSON unless we know it's an endpoint that
              // took a different format.
              headers['Content-Type'] = 'application/json',
              body = JSON.stringify(newParams);
        }

        console.log('api', url);
        return fetch(url, {
          method: 'POST',
          headers: headers,
          credentials: "omit",
          body: body,
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
    };
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
          SecureStore.setItemAsync('i', i);
          SecureStore.setItemAsync('instance', instance);
      },
      logout: () => {
          setAccessToken(null);
          setInstance('');
          SecureStore.deleteItemAsync('i');
          SecureStore.deleteItemAsync('instance');
      },
      api: api,
      addFile: async (onFilePicked, onProgress) => {
        return new Promise(async (resolve, reject) => {
            const endpoint = "drive/files/create";
            if (!instance) {
                return new Promise( () => {});
                // throw new Error('No instance');
            }
            const url = 'https://' + instance + '/api/' + endpoint;
            const doc = await DocumentPicker.getDocumentAsync({});
            if (onFilePicked) {
                onFilePicked(doc.name, doc.size);
            }
            const params = {
                 name: doc.name,
                 file: {
                   uri: doc.uri,
                   name: doc.name,
                   type: 'multipart/form-data',
               }
             }
            const newParams = {
                i: accessToken, 
                ...params,
            };

            const body = new FormData();
            for (const element in newParams) {
                body.append(element, newParams[element]);
            }
            ToastAndroid.show('Starting upload...', ToastAndroid.SHORT);

             // we can't use api() because the fetch api doesn't have any way
             // to monitor upload progress, and we want to show pro
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);
            xhr.upload.addEventListener('load', (e) => {
                if (onProgress) {
                    onProgress(e.loaded, e.total);
                }
                resolve();
            });
            xhr.upload.addEventListener('progress', (e) => {
                if (onProgress)
                    onProgress(e.loaded, e.total);
            });
            xhr.onerror = () => {
                reject('Could not upload file');
            }
            xhr.send(body);
        });
    },
    // this doesn't belong here, but is exported so that the useDrive hook
    // knows if it needs to re-load
    lastUpload: lastUpload,
    ws: socket,
  };
}
