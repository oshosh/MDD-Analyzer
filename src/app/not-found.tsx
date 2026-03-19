/**
 * 현재 프로젝트 기준으로는 app 내 그룹으로 layout.tsx 파일이 존재않기 때문에 일단 글로벌 404 페이즐 사용 합니다.
 */
export default function GlobalNotFound() {
  return (
    <main className="error-page">
      <h1>404 Not Found</h1>
      <p>요청한 경로를 찾을 수 없습니다.</p>
    </main>
  )
}
