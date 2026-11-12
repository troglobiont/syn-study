export const CHEATSHEET_HTML = `
<div class="cheatsheet-content">
  <details>
    <summary>Геометрия</summary>
    <dl class="formula-list">
      <div><dt>Длина окружности</dt><dd>L = 2πr</dd></div>
      <div><dt>Площадь круга</dt><dd>S = πr²</dd></div>
      <div><dt>Площадь прямоугольника</dt><dd>S = ab</dd></div>
      <div><dt>Площадь треугольника</dt><dd>S = ah/2</dd></div>
      <div><dt>Площадь трапеции</dt><dd>S = (a + b)h/2</dd></div>
      <div><dt>Теорема Пифагора</dt><dd>a² + b² = c²</dd></div>
      <div><dt>Объём цилиндра</dt><dd>V = πr²h</dd></div>
      <div><dt>Объём конуса</dt><dd>V = πr²h/3</dd></div>
      <div><dt>Объём шара</dt><dd>V = 4πr³/3</dd></div>
      <div><dt>Площадь сферы</dt><dd>S = 4πr²</dd></div>
    </dl>
    <p class="reference-note">r — радиус, h — высота. В формуле площади треугольника h проведена к стороне a. В трапеции a и b — параллельные основания. В теореме Пифагора a и b — катеты, c — гипотенуза.</p>
  </details>
  <details>
    <summary>Алгебра</summary>
    <dl class="formula-list">
      <div><dt>Квадрат суммы</dt><dd>(a + b)² = a² + 2ab + b²</dd></div>
      <div><dt>Квадрат разности</dt><dd>(a − b)² = a² − 2ab + b²</dd></div>
      <div><dt>Разность квадратов</dt><dd>a² − b² = (a − b)(a + b)</dd></div>
      <div><dt>Степени</dt><dd>a<sup>m</sup> · a<sup>n</sup> = a<sup>m+n</sup>, (a<sup>m</sup>)<sup>n</sup> = a<sup>mn</sup></dd></div>
      <div><dt>Отрицательная степень</dt><dd>a<sup>−n</sup> = 1/a<sup>n</sup> при a ≠ 0</dd></div>
      <div><dt>Квадратный корень</dt><dd>√(a²) = |a|</dd></div>
      <div><dt>Линейное уравнение</dt><dd>ax + b = 0 ⇒ x = −b/a при a ≠ 0</dd></div>
    </dl>
    <p class="reference-note">В правилах степеней m и n — натуральные числа.</p>
  </details>
  <details>
    <summary>Квадратное уравнение</summary>
    <p>Для ax² + bx + c = 0 при a ≠ 0 вычисли дискриминант D = b² − 4ac.</p>
    <dl class="formula-list">
      <div><dt>D &gt; 0</dt><dd>Два корня: x₁,₂ = (−b ± √D)/(2a)</dd></div>
      <div><dt>D = 0</dt><dd>Один корень: x = −b/(2a)</dd></div>
      <div><dt>D &lt; 0</dt><dd>Действительных корней нет</dd></div>
      <div><dt>Теорема Виета, D ≥ 0</dt><dd>x₁ + x₂ = −b/a, x₁x₂ = c/a</dd></div>
    </dl>
    <p class="reference-note">В формуле Виета двойной корень считают дважды. Например, у x² − 5x + 6 = 0 дискриминант равен 1, корни — 2 и 3.</p>
  </details>
  <details>
    <summary>Тригонометрия</summary>
    <table class="angle-table" aria-label="Синус, косинус и тангенс основных углов">
      <thead><tr><th scope="col">Градусы</th><th scope="col">Радианы</th><th scope="col">sin</th><th scope="col">cos</th><th scope="col">tg</th></tr></thead>
      <tbody>
        <tr><th scope="row">0°</th><td>0</td><td>0</td><td>1</td><td>0</td></tr>
        <tr><th scope="row">30°</th><td>π/6</td><td>1/2</td><td>√3/2</td><td>√3/3</td></tr>
        <tr><th scope="row">45°</th><td>π/4</td><td>√2/2</td><td>√2/2</td><td>1</td></tr>
        <tr><th scope="row">60°</th><td>π/3</td><td>√3/2</td><td>1/2</td><td>√3</td></tr>
        <tr><th scope="row">90°</th><td>π/2</td><td>1</td><td>0</td><td>—</td></tr>
      </tbody>
    </table>
    <p class="reference-note">180° = π радиан. sin²x + cos²x = 1. tg x = sin x / cos x, поэтому тангенс при 90° не определён.</p>
  </details>
  <details>
    <summary>Основные производные</summary>
    <p class="reference-note">В производных тригонометрических функций угол x измеряется в радианах.</p>
    <dl class="formula-list">
      <div><dt>Постоянная и аргумент</dt><dd>(c)′ = 0, (x)′ = 1</dd></div>
      <div><dt>Степень</dt><dd>(x<sup>n</sup>)′ = nx<sup>n−1</sup> при n = 2, 3, …</dd></div>
      <div><dt>Обратные степени, x ≠ 0</dt><dd>(1/x)′ = −1/x², (1/x²)′ = −2/x³</dd></div>
      <div><dt>Корень, x &gt; 0</dt><dd>(√x)′ = 1/(2√x)</dd></div>
      <div><dt>Синус и косинус</dt><dd>(sin x)′ = cos x, (cos x)′ = −sin x</dd></div>
      <div><dt>Тангенс, cos x ≠ 0</dt><dd>(tg x)′ = 1/cos²x</dd></div>
      <div><dt>Котангенс, sin x ≠ 0</dt><dd>(ctg x)′ = −1/sin²x</dd></div>
      <div><dt>Экспонента</dt><dd>(eˣ)′ = eˣ</dd></div>
      <div><dt>Логарифм, x &gt; 0</dt><dd>(ln x)′ = 1/x</dd></div>
    </dl>
    <dl class="formula-list" aria-label="Правила дифференцирования">
      <div><dt>Сумма</dt><dd>(u + v)′ = u′ + v′</dd></div>
      <div><dt>Произведение</dt><dd>(uv)′ = u′v + uv′</dd></div>
      <div><dt>Частное, v ≠ 0</dt><dd>(u/v)′ = (u′v − uv′)/v²</dd></div>
      <div><dt>Сложная функция</dt><dd>(f(g(x)))′ = f′(g(x)) · g′(x)</dd></div>
    </dl>
  </details>
</div>`;
