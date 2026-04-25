export default function Disclaimer() {
  return (
    <div className="mx-4 mb-16 mt-4 space-y-2">
      <div className="bg-[#FFF8F0] border border-[#FDDCB5] rounded-lg px-3 py-2 text-center">
        <p className="text-[11px] text-[#9A6B3C] leading-relaxed">
          본 정보는 참고용이며 실제와 다를 수 있습니다. 정확한 내용은 공식 사이트에서 확인하세요.
          <br />
          오류나 의견이 있으시면{' '}
          <a
            href="https://smart-ai-life.tistory.com/guestbook"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[#7A4B1C]"
          >
            방명록
          </a>
          에 남겨주세요.
        </p>
      </div>
      <div className="bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg px-3 py-2 text-center">
        <p className="text-[11px] text-[#475569] leading-relaxed">
          이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
        </p>
      </div>
    </div>
  );
}
