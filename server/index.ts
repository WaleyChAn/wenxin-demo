import { createServer } from 'http';
import axios from 'axios';
import 'dotenv/config';
import { Stream } from 'stream';
import { createReadStream } from 'fs';

const { WENXIN_API_URL, WENXIN_API_KEY, WENXIN_SECRET_KEY } = process.env;
let accessToken: String = '';

const api = axios.create({
  baseURL: WENXIN_API_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

const getAccessToken = async () => {
  if (accessToken) {
    return accessToken;
  }
  const { data } = await api.post(
    `/oauth/2.0/token?client_id=${WENXIN_API_KEY}&client_secret=${WENXIN_SECRET_KEY}&grant_type=client_credentials`
  );
  if (data && data.access_token) {
    accessToken = data.access_token;
  }
  return accessToken;
};

const getErnieBotData = async (params: Object) => {
  const currentAccessToken = await getAccessToken();
  if (!currentAccessToken) {
    return;
  }
  const { data } = await api.post<Stream>(
    `/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/eb-instant?access_token=${currentAccessToken}`,
    params,
    {
      responseType: 'stream',
    }
  );
  return data;
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url!, 'file:///');
  const messages = url.searchParams.get('message') || '';

  switch (url.pathname) {
    case '/':
      createReadStream('./index.html').pipe(res);
      break;
    case '/chat':
      res.setHeader('Content-Type', 'text/event-stream');

      const data = await getErnieBotData({
        messages: [
          {
            role: 'user',
            content: messages,
          },
        ],
        stream: true,
      });
      data!.pipe(res);
      break;
    default:
      res.statusCode = 404;
      res.end();
  }
}).listen(9001);
console.log('Server running at http://localhost:9001');
