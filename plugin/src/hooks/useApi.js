import { useCallback } from "react";

const useApi = ({ token }) => {

  console.log('JRUMEAU', 'useApi')
  const postCallLog = useCallback(async (data) => {
    const request = await fetch(`${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/call`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data,
        Token: token
      })
    });

    return await request.json();

  }, [token]);

  return {
    postCallLog,
  }
}

export default useApi;