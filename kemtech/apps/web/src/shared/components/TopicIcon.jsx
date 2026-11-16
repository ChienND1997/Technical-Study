import { useState } from 'react';

/** Topic slug -> devicon name (colored brand logos). Topics without a brand logo use their emoji. */
const LOGOS = {
  java: 'java', 'java-core': 'java', 'java-concurrency': 'java', 'spring-boot': 'spring',
  database: 'postgresql', redis: 'redis', kafka: 'apachekafka', devops: 'docker',
  javascript: 'javascript', react: 'react', vue: 'vuejs',
};
const CDN = 'https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons';

/** Brand logo when one exists, otherwise the emoji from topics.json (also used if the logo fails to load). */
export default function TopicIcon({ slug, emoji = '📘', size = 36 }) {
  const [failed, setFailed] = useState(false);
  const name = LOGOS[slug];
  if (!name || failed) return <span className="topic-ic">{emoji}</span>;
  return (
    <img className="topic-logo" src={`${CDN}/${name}/${name}-original.svg`} alt="" width={size} height={size} loading="lazy" onError={() => setFailed(true)} />
  );
}
