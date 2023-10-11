import { H } from 'highlight.run';

H.init('jd4100d5', {
  environment: 'production',
  version: '0.1.1',
  tracingOrigins: true,
  networkRecording: {
    enabled: true,
    recordHeadersAndBody: true
  }
});
