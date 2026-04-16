/**
 * 주유소 API 순수 함수 helper.
 * route.ts에서 import하여 사용하며, 동시에 mjs 테스트에서도 import 가능.
 */

/**
 * 오피넷 KATEC 원본 좌표가 저정밀(소수점 이하 미제공)인지 판정.
 *
 * 오피넷 응답에서 일부 주유소는 `"GIS_X_COOR":303700.00000` 처럼
 * 소수점 이하가 모두 0인 정수 좌표를 내려준다. 정밀 좌표는 보통
 * `300993.58270` 같이 소수점 5자리까지 의미있는 값을 가진다.
 *
 * 정수 좌표는 변환 자체는 성공하지만 실제 간판 위치와 수십~100m
 * 오차가 발생할 수 있어 UI에 별도 표기가 필요하다.
 *
 * 부동소수점 정확도 보정을 위해 round 비교 사용 (1e-6 미만이면 정수로 간주).
 */
export function isLowPrecisionKatec(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return (
    Math.abs(x - Math.round(x)) < 1e-6 &&
    Math.abs(y - Math.round(y)) < 1e-6
  );
}

/**
 * (x, y) 좌표 + 변환 결과를 받아 coord_source를 결정.
 *  - "katec":     변환 성공 + 원본 정밀
 *  - "katec_low": 변환 성공 + 원본 100단위 반올림
 *  - "none":      변환 실패 또는 좌표 없음
 */
export function classifyCoordSource(x, y, wgs) {
  if (!wgs) return "none";
  if (!Number.isFinite(x) || !Number.isFinite(y)) return "none";
  return isLowPrecisionKatec(x, y) ? "katec_low" : "katec";
}
