import { useContext } from 'react';
import {AccountContext } from './Account';

export function useAPI(endpoint, params) {
    const account = useContext(AccountContext);
    return { 
        call: (endpoint, params) => {
          const url = 'https://' + account.instance + "/api/" + endpoint;
          const newparams = {
            i: account.i,
            ...params,
          };
          return fetch(
            url,
            {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
              credentials: "omit",
              body: JSON.stringify(newparams)
            }
          ).then((resp) => {
            if (!resp.ok) {
              throw new Error("Response code was " + resp.status);
            }
            return resp.json()
          }).then( (json) => {
            if (json.error) {
                // console.log(json);
              throw new Error(json);
            }
            return json;
          });
        }
      };
  }
