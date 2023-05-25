import { useContext } from 'react';
import {AccountContext } from './Account';

export function useAPI(endpoint, params) {
  const account = useContext(AccountContext);
  return { 
    call: account.api,
  };
}
