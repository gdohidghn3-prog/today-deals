import { Octokit } from "@octokit/rest";

type CoupangEntry = {
  productUrl: string;
  productImage: string;
  productName: string;
  productPrice: number;
  isRocket?: boolean;
};

type LinksFile = {
  updatedAt: string;
  links: Record<string, CoupangEntry & { note?: string }>;
};

function getClient() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  if (!token || !repo) throw new Error("GITHUB_TOKEN / GITHUB_REPO 환경변수 필요");
  const [owner, name] = repo.split("/");
  const branch = process.env.GITHUB_BRANCH || "main";
  return { octokit: new Octokit({ auth: token }), owner, repo: name, branch };
}

async function getFile(path: string) {
  const { octokit, owner, repo, branch } = getClient();
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref: branch });
    if (Array.isArray(data) || data.type !== "file") throw new Error("파일이 아님");
    const content = Buffer.from(data.content, "base64").toString("utf8");
    return { content, sha: data.sha };
  } catch (e: unknown) {
    const err = e as { status?: number };
    if (err.status === 404) return null;
    throw e;
  }
}

async function putFile(path: string, content: string, message: string, sha?: string) {
  const { octokit, owner, repo, branch } = getClient();
  await octokit.repos.createOrUpdateFileContents({
    owner, repo, path, branch, message, sha,
    content: Buffer.from(content, "utf8").toString("base64"),
  });
}

export async function getCoupangLinks(): Promise<LinksFile> {
  const file = await getFile("data/coupang-links.json");
  if (!file) return { updatedAt: new Date().toISOString().slice(0, 10), links: {} };
  return JSON.parse(file.content) as LinksFile;
}

export async function saveCoupangLink(dealId: string, entry: CoupangEntry) {
  const file = await getFile("data/coupang-links.json");
  const current: LinksFile = file
    ? JSON.parse(file.content)
    : { updatedAt: new Date().toISOString().slice(0, 10), links: {} };
  current.links[dealId] = entry;
  current.updatedAt = new Date().toISOString().slice(0, 10);
  await putFile(
    "data/coupang-links.json",
    JSON.stringify(current, null, 2) + "\n",
    `chore(coupang): ${dealId} 매핑 저장`,
    file?.sha,
  );
}

export async function deleteCoupangLink(dealId: string) {
  const file = await getFile("data/coupang-links.json");
  if (!file) return;
  const current: LinksFile = JSON.parse(file.content);
  if (!current.links[dealId]) return;
  delete current.links[dealId];
  current.updatedAt = new Date().toISOString().slice(0, 10);
  await putFile(
    "data/coupang-links.json",
    JSON.stringify(current, null, 2) + "\n",
    `chore(coupang): ${dealId} 매핑 삭제`,
    file.sha,
  );
}

export async function uploadImage(dealId: string, dataBase64: string, ext: string): Promise<string> {
  const safeExt = /^(jpg|jpeg|png|webp)$/i.test(ext) ? ext.toLowerCase() : "jpg";
  const path = `public/coupang/${dealId}.${safeExt}`;
  const file = await getFile(path);
  const { octokit, owner, repo, branch } = getClient();
  await octokit.repos.createOrUpdateFileContents({
    owner, repo, path, branch,
    message: `chore(coupang): ${dealId} 이미지 업로드`,
    content: dataBase64,
    sha: file?.sha,
  });
  return `/coupang/${dealId}.${safeExt}`;
}
