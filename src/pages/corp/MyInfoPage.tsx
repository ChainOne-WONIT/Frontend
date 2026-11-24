import { useState } from 'react';
import { getMyInfo, updateConsent } from '../../api/corp';
import { Card, ErrorBox, KeyValue, Loading, Note, Pill } from '../../components/ui';
import { PageHead } from '../../layouts/CorpLayout';
import { useAsync } from '../../lib/useAsync';

export function MyInfoPage() {
  const { data, error, loading, reload, setData } = useAsync(getMyInfo, []);
  const [busy, setBusy] = useState('');

  if (loading && !data) return <Loading />;
  if (error || !data)
    return <ErrorBox error={error ?? new Error('데이터가 없습니다.')} onRetry={reload} />;
  const { company: c, account: a } = data;

  const toggle = async (key: string, agreed: boolean) => {
    if (!agreed && !confirm('동의를 철회하면 이 정보는 리스크 경보에 쓰이지 않습니다. 철회할까요?'))
      return;
    setBusy(key);
    try {
      setData(await updateConsent(key, agreed));
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      <PageHead title="내 정보" sub="기업 정보와 정보 제공 동의를 확인합니다." />
      <div className="grid-2">
        <Card title="기업 정보">
          <KeyValue
            rows={[
              ['기업명', c.name],
              ['사업자등록번호', c.bizNo],
              ['대표자', c.ceoName],
              ['업종', c.industry],
              ['사업장 주소', c.address],
              ['담당자 이메일', c.email],
            ]}
          />
          <div style={{ marginTop: 12 }}>
            <Note>기업 정보는 조회만 할 수 있습니다. 수정은 은행 담당자에게 요청해 주세요.</Note>
          </div>
        </Card>
        <Card title="동의 관리">
          <ul className="list">
            {data.consents.map((x) => (
              <li key={x.key} className="list__item">
                <div className="list__main">
                  <div className="list__title">
                    {x.label}{' '}
                    <Pill tone={x.required ? 'bad' : 'gray'}>{x.required ? '필수' : '선택'}</Pill>
                  </div>
                  <div className="list__sub">
                    {x.agreedAt} {x.agreed ? '동의' : '철회'}
                  </div>
                </div>
                {x.required ? (
                  <span className="small muted">변경 불가</span>
                ) : (
                  <button
                    type="button"
                    className={`btn btn--sm ${x.agreed ? 'btn--soft' : 'btn--outline'}`}
                    disabled={busy === x.key}
                    onClick={() => toggle(x.key, !x.agreed)}
                  >
                    {x.agreed ? '동의함 · 철회하기' : '동의하기'}
                  </button>
                )}
              </li>
            ))}
          </ul>
          <Note>선택 항목을 철회하면 그 정보는 리스크 경보에 쓰이지 않습니다.</Note>
        </Card>
      </div>
      <Card title="계정">
        <KeyValue
          rows={[
            ['아이디', a.loginId],
            ['계정 유형', a.accountType],
            ['최근 접속', a.lastLogin],
            [
              '비밀번호',
              <span className="row-gap" key="pw">
                {a.passwordChangedAt} 변경
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => alert('비밀번호 변경 화면은 백엔드 연결 후 이어서 만듭니다.')}
                >
                  비밀번호 변경
                </button>
              </span>,
            ],
          ]}
        />
      </Card>
    </>
  );
}
