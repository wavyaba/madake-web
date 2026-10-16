'use client';

import { useEffect, useRef, useState } from 'react';
import './globals-madake.css';

export default function MadakePage() {
  const currentSlideRef = useRef(0);
  const autoTimerRef = useRef(null);

  const [formValues, setFormValues] = useState({ nombre: '', empresa: '', telefono: '', correo: '', mensaje: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [fieldInvalid, setFieldInvalid] = useState({});
  const [charCount, setCharCount] = useState(0);
  const [charWarn, setCharWarn] = useState(false);
  const [submitDisabled, setSubmitDisabled] = useState(false);
  const [submitText, setSubmitText] = useState('Enviar solicitud →');
  const [submitStyle, setSubmitStyle] = useState({});
  const [alertSuccess, setAlertSuccess] = useState(false);
  const [alertError, setAlertError] = useState(false);
  const [alertErrorText, setAlertErrorText] = useState('✖ Ocurrió un error. Por favor intente de nuevo.');

  const INJECTION_RE = /(<script|javascript:|on\w+=|SELECT\s+\*|DROP\s+TABLE|UNION\s+SELECT|INSERT\s+INTO|--\s|\/\*)/i;

  function validateField(id, value) {
    const v = (value !== undefined ? value : formValues[id]).trim();
    let msg = '';
    if (id !== 'mensaje' && v.length === 0) msg = 'Este campo es requerido.';
    else if (id === 'nombre'   && v.length < 2)   msg = 'Mínimo 2 caracteres.';
    else if (id === 'empresa'  && v.length < 2)   msg = 'Mínimo 2 caracteres.';
    else if (id === 'telefono' && !/^[\+]?[0-9()\-\s]{7,20}$/.test(v)) msg = 'Teléfono no válido.';
    else if (id === 'correo'   && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = 'Correo no válido.';
    else if (id === 'mensaje'  && v.length > 1000) msg = 'Máximo 1000 caracteres.';
    else if (INJECTION_RE.test(v)) msg = 'Caracteres no permitidos.';
    setFieldErrors(prev => ({ ...prev, [id]: msg }));
    setFieldInvalid(prev => ({ ...prev, [id]: !!msg }));
    return !msg;
  }

  function handleBlur(id) { validateField(id, formValues[id]); }

  function handleChange(id, value) {
    setFormValues(prev => ({ ...prev, [id]: value }));
    if (id === 'mensaje') { setCharCount(value.length); setCharWarn(value.length > 900); }
    if (fieldInvalid[id]) validateField(id, value);
  }

  async function handleSubmit() {
    const fields = ['nombre', 'empresa', 'telefono', 'correo', 'mensaje'];
    if (!fields.every(id => validateField(id, formValues[id]))) return;
    setSubmitDisabled(true); setSubmitText('Enviando...');
    setAlertSuccess(false); setAlertError(false);
    const payload = {};
    fields.forEach(id => (payload[id] = formValues[id].trim()));
    try {
      const res  = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAlertSuccess(true);
        setFormValues({ nombre: '', empresa: '', telefono: '', correo: '', mensaje: '' });
        setCharCount(0); setCharWarn(false);
        setSubmitText('✔ Enviado'); setSubmitStyle({ background: '#1A7A4A', color: '#fff' });
        setTimeout(() => { setSubmitDisabled(false); setSubmitText('Enviar solicitud →'); setSubmitStyle({}); }, 4000);
      } else {
        setAlertErrorText('✖ ' + (data.error || 'Error al enviar.'));
        setAlertError(true); setSubmitDisabled(false); setSubmitText('Enviar solicitud →');
      }
    } catch (e) {
      setAlertError(true); setSubmitDisabled(false); setSubmitText('Enviar solicitud →');
    }
  }

  useEffect(() => {
    document.body.classList.add('hero-ready');
    window.scrollTo({ top: 0, behavior: 'instant' });
    const vid = document.querySelector('.hero-video');
    if (vid) { vid.muted = true; vid.play().catch(() => {}); }

    const slides = document.querySelectorAll('.testimonial-slide');
    const dots   = document.querySelectorAll('.dot');
    const track  = document.getElementById('carouselTrack');

    function setSlide(n) {
      const cur = currentSlideRef.current;
      slides[cur].classList.remove('active'); dots[cur].classList.remove('active');
      const next = (n + slides.length) % slides.length;
      currentSlideRef.current = next;
      slides[next].classList.add('active'); dots[next].classList.add('active');
      if (track) track.style.minHeight = slides[next].scrollHeight + 'px';
    }
    window.goToSlide = function(n) { clearInterval(autoTimerRef.current); setSlide(n); startAuto(); };
    window.nextSlide = function() { window.goToSlide(currentSlideRef.current + 1); };
    window.prevSlide = function() { window.goToSlide(currentSlideRef.current - 1); };
    function startAuto() { autoTimerRef.current = setInterval(() => setSlide(currentSlideRef.current + 1), 5000); }
    if (track && slides.length > 0) track.style.minHeight = slides[0].scrollHeight + 'px';
    startAuto();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

    function handleScroll() {
      const nav = document.querySelector('.hero-nav');
      if (nav) nav.classList.toggle('scrolled', window.scrollY > 60);
    }
    window.addEventListener('scroll', handleScroll);

    return () => {
      clearInterval(autoTimerRef.current);
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      delete window.goToSlide; delete window.nextSlide; delete window.prevSlide;
    };
  }, []);

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Barlow+Condensed:wght@600;700&display=swap" rel="stylesheet" />

      <nav className="hero-nav">
        <a className="nav-logo-pill" href="#">
          <img src="madake-logo.png" alt="Madake Seguridad" />
          <span className="nav-logo-text">Corporación Madake</span>
        </a>
        <div className="nav-links-pill">
          <a className="nav-link" href="#servicios">Servicios</a>
          <a className="nav-link" href="#nosotros">Nosotros</a>
          <a className="nav-link" href="#testimonios">Clientes</a>
          <a className="nav-link" href="#contacto">Contacto</a>
        </div>
        <a className="nav-cta-pill" href="#contacto">Cotizar</a>
      </nav>

      <section className="hero-section">
        <video className="hero-video" autoPlay muted loop playsInline>
  <source src="hero-madake.webm" type="video/webm" />
  <source src="hero-madake.mp4" type="video/mp4" />
</video>
        <div className="hero-overlay"></div>
        <div className="hero-fg">
          <div className="hero-content">
            <div className="hero-inner">
              <span className="hero-logo-center"><img src="madake-logo.png" alt="Madake Seguridad" /></span>
              <div className="hero-badge">Seguridad certificada en México <span className="badge-arrow">→</span></div>
              <h1 className="hero-h1">Una Operación <span>segura</span><br />empieza con confianza</h1>
              <p className="hero-sub">Corporación Madake SA de CV — soluciones de seguridad privada para empresas, instalaciones y eventos en México.</p>
              <div className="hero-trust-badges">
                <div className="trust-badge"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#C8980A" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>Personal certificado</div>
                <div className="trust-badge"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#C8980A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Disponible 24/7</div>
                <div className="trust-badge"><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#C8980A" strokeWidth="2"><path d="M9 11l3 3L22 4"/></svg>+70 elementos</div>
              </div>
              <a className="hero-cta-btn" href="#contacto">Solicitar cotización gratuita <span className="cta-arrow">→</span></a>
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat-item"><div className="stat-num">+70</div><div className="stat-lbl">Elementos</div></div>
            <div className="stat-item"><div className="stat-num">+8</div><div className="stat-lbl">Años</div></div>
            <div className="stat-item"><div className="stat-num">24/7</div><div className="stat-lbl">Operación</div></div>
          </div>
          <div className="scroll-indicator">
            <div className="scroll-dot"></div><div className="scroll-dot"></div><div className="scroll-dot"></div>
          </div>
        </div>
      </section>

      <div className="stats-bar">
        <div className="stats-inner reveal">
          <div><div className="s-num">24/7</div><div className="s-lbl">Operación continua</div></div>
          <div><div className="s-num">+8</div><div className="s-lbl">Años de experiencia</div></div>
          <div><div className="s-num">100%</div><div className="s-lbl">Personal certificado</div></div>
        </div>
      </div>

      <section className="section" id="servicios">
        <div className="section-inner">
          <div className="section-label reveal">Nuestros servicios</div>
          <div className="section-title reveal">Lo que ofrecemos</div>
          <p className="section-sub reveal">Soluciones integrales de seguridad adaptadas a las necesidades de cada cliente.</p>
          <div className="services-grid">
            <div className="service-card reveal"><div className="service-icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#1A2E45" strokeWidth="1.8"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg></div><span className="accent-line"></span><h3>Guardias de seguridad</h3><p>Personal entrenado y uniformado para vigilancia fija en sus instalaciones.</p></div>
            <div className="service-card reveal"><div className="service-icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#1A2E45" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div><span className="accent-line"></span><h3>Manejo de CCTV</h3><p>Guardias con manejo de los distintos sistemas de videovigilancia con monitoreo en tiempo real.</p></div>
            <div className="service-card reveal"><div className="service-icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#1A2E45" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div><span className="accent-line"></span><h3>Seguridad industrial</h3><p>Protección especializada para plantas, bodegas y zonas industriales.</p></div>
            <div className="service-card reveal"><div className="service-icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#1A2E45" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div><span className="accent-line"></span><h3>Seguridad en eventos</h3><p>Control de acceso y protección para eventos masivos y corporativos.</p></div>
            <div className="service-card reveal"><div className="service-icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#1A2E45" strokeWidth="1.8"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></div><span className="accent-line"></span><h3>Control de accesos</h3><p>Gestión de entradas, credencialización y supervisión de visitantes.</p></div>
            <div className="service-card reveal"><div className="service-icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#1A2E45" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div><span className="accent-line"></span><h3>C-TPAT</h3><p>Si la empresa lo requiere, tenemos guardias con la capacidad de cumplir con los estándares de seguridad C-TPAT.</p></div>
            <div className="service-card reveal"><div className="service-icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#1A2E45" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 11l3 3L22 4"/></svg></div><span className="accent-line"></span><h3>Seguridad Residencial</h3><p>Cobertura para desarrollos y propiedades que requieren vigilancia y control de acceso.</p></div>
          </div>
        </div>
      </section>

      <section className="section" id="nosotros">
        <div className="section-inner">
          <div className="nosotros-layout">
            <div className="nosotros-text reveal">
              <div className="section-label">Quiénes somos</div>
              <div className="section-title">Más de una década<br />protegiendo lo que importa</div>
              <p>Corporación Madake SA de CV es una empresa mexicana de seguridad privada fundada con el propósito de ofrecer soluciones confiables, profesionales y adaptadas a cada cliente. Operamos en todo el país con personal altamente capacitado y certificado ante las autoridades competentes.</p>
              <p>Nuestro compromiso es brindar tranquilidad real: no solo custodia, sino inteligencia de seguridad, tecnología y protocolos que se anticipan al riesgo antes de que ocurra.</p>
            </div>
            <div className="nosotros-pillars reveal">
              <div className="pillar"><div className="pillar-icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#F0B429" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div className="pillar-body"><h4>Misión</h4><p>Proteger personas, bienes e instalaciones con soluciones de seguridad integrales, eficaces y con los más altos estándares de profesionalismo.</p></div></div>
              <div className="pillar"><div className="pillar-icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#F0B429" strokeWidth="1.8"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></div><div className="pillar-body"><h4>Visión</h4><p>Ser la empresa de seguridad privada más confiable de la región, reconocida por nuestra ética, respuesta inmediata y tecnología de vanguardia.</p></div></div>
              <div className="pillar"><div className="pillar-icon"><svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#F0B429" strokeWidth="1.8"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg></div><div className="pillar-body"><h4>Valores</h4><p>Honestidad, disciplina, lealtad al cliente y mejora continua. Cada elemento nuestro representa a la empresa con orgullo y responsabilidad.</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="testimonios">
        <div className="section-inner">
          <div className="section-label reveal" style={{ textAlign: 'center' }}>Lo que dicen nuestros clientes</div>
          <div className="section-title reveal" style={{ textAlign: 'center', marginBottom: '48px' }}>Clientes que confían en Madake</div>
          <div className="carousel-wrap reveal">
            <div className="carousel-track" id="carouselTrack">
              <div className="testimonial-slide active">
                <div className="testimonial-photo"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="16" r="8" fill="#F0B429"/><path d="M4 38c0-8.837 7.163-16 16-16s16 7.163 16 16" fill="#F0B429"/></svg></div>
                <p className="testimonial-quote">&ldquo;Llevamos más de dos años trabajando con Madake y la diferencia es notable. Su personal es profesional, puntual y siempre está bien presentado. Hemos reducido los incidentes en nuestras instalaciones casi a cero.&rdquo;</p>
                <div className="testimonial-author"><strong>Ricardo Fuentes Morales</strong><span>Director de Operaciones · Grupo Industrial Norteño</span></div>
              </div>
              <div className="testimonial-slide">
                <div className="testimonial-photo"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="16" r="8" fill="#F0B429"/><path d="M4 38c0-8.837 7.163-16 16-16s16 7.163 16 16" fill="#F0B429"/></svg></div>
                <p className="testimonial-quote">&ldquo;Contratamos a Madake para seguridad en un evento corporativo con más de 800 asistentes. El control de acceso fue impecable y no tuvimos ningún contratiempo. Los recomendaría sin dudarlo.&rdquo;</p>
                <div className="testimonial-author"><strong>Gabriela Solís Ríos</strong><span>Coordinadora de Eventos · Cámara de Comercio Regional</span></div>
              </div>
              <div className="testimonial-slide">
                <div className="testimonial-photo"><svg width="40" height="40" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="16" r="8" fill="#F0B429"/><path d="M4 38c0-8.837 7.163-16 16-16s16 7.163 16 16" fill="#F0B429"/></svg></div>
                <p className="testimonial-quote">&ldquo;Lo que más valoro de Madake es la comunicación directa con su equipo. Cualquier ajuste en los turnos o requerimiento especial lo resuelven el mismo día. Es la primera empresa de seguridad con la que me siento realmente respaldado.&rdquo;</p>
                <div className="testimonial-author"><strong>Ing. Marcos Téllez</strong><span>Gerente de Planta · Manufactura del Norte SA</span></div>
              </div>
            </div>
            <div className="carousel-dots">
              <button className="dot active" onClick={() => window.goToSlide && window.goToSlide(0)} aria-label="Testimonio 1"></button>
              <button className="dot" onClick={() => window.goToSlide && window.goToSlide(1)} aria-label="Testimonio 2"></button>
              <button className="dot" onClick={() => window.goToSlide && window.goToSlide(2)} aria-label="Testimonio 3"></button>
            </div>
            <div className="carousel-arrows">
              <button className="carousel-arrow" onClick={() => window.prevSlide && window.prevSlide()} aria-label="Anterior"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#0D1B2A" strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg></button>
              <button className="carousel-arrow" onClick={() => window.nextSlide && window.nextSlide()} aria-label="Siguiente"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#0D1B2A" strokeWidth="2.2"><path d="M9 18l6-6-6-6"/></svg></button>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="contacto">
        <div className="section-inner">
          <div className="form-layout">
            <div className="form-pitch reveal">
              <div className="section-label">Contáctenos</div>
              <h2 className="section-title">¿Listo para proteger<br />su espacio?</h2>
              <p>Déjenos sus datos y uno de nuestros asesores se pondrá en contacto en menos de 24 horas para ofrecerle una cotización personalizada — sin compromiso.</p>
              <ul>
                <li><div className="check-icon"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#1A7A4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>Respuesta en menos de 24 horas</li>
                <li><div className="check-icon"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#1A7A4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>Cotización gratuita y sin compromiso</li>
                <li><div className="check-icon"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#1A7A4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>Asesoría personalizada para su sector</li>
                <li><div className="check-icon"><svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#1A7A4A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>Sus datos son confidenciales y están protegidos</li>
              </ul>
            </div>
            <div className="reveal">
              <div className="contact-form">
                <h3>Solicitar información</h3>
                <p className="form-sub">Complete el formulario y lo contactamos a la brevedad.</p>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="nombre">Nombre completo *</label>
                    <input type="text" id="nombre" placeholder="Ej. Juan Pérez" autoComplete="name" maxLength={100} value={formValues.nombre} onChange={e => handleChange('nombre', e.target.value)} onBlur={() => handleBlur('nombre')} className={fieldInvalid.nombre ? 'is-invalid' : ''} />
                    {fieldErrors.nombre && <div className="field-error visible">{fieldErrors.nombre}</div>}
                  </div>
                  <div className="field">
                    <label htmlFor="empresa">Empresa / Negocio *</label>
                    <input type="text" id="empresa" placeholder="Nombre de su empresa" maxLength={120} value={formValues.empresa} onChange={e => handleChange('empresa', e.target.value)} onBlur={() => handleBlur('empresa')} className={fieldInvalid.empresa ? 'is-invalid' : ''} />
                    {fieldErrors.empresa && <div className="field-error visible">{fieldErrors.empresa}</div>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="field">
                    <label htmlFor="telefono">Teléfono *</label>
                    <input type="tel" id="telefono" placeholder="Ej. 444 123 4567" autoComplete="tel" maxLength={20} value={formValues.telefono} onChange={e => handleChange('telefono', e.target.value)} onBlur={() => handleBlur('telefono')} className={fieldInvalid.telefono ? 'is-invalid' : ''} />
                    {fieldErrors.telefono && <div className="field-error visible">{fieldErrors.telefono}</div>}
                  </div>
                  <div className="field">
                    <label htmlFor="correo">Correo electrónico *</label>
                    <input type="email" id="correo" placeholder="correo@empresa.com" autoComplete="email" maxLength={254} value={formValues.correo} onChange={e => handleChange('correo', e.target.value)} onBlur={() => handleBlur('correo')} className={fieldInvalid.correo ? 'is-invalid' : ''} />
                    {fieldErrors.correo && <div className="field-error visible">{fieldErrors.correo}</div>}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="mensaje">¿Cómo podemos ayudarle?</label>
                  <textarea id="mensaje" placeholder="Cuéntenos qué tipo de seguridad necesita..." maxLength={1000} value={formValues.mensaje} onChange={e => handleChange('mensaje', e.target.value)} onBlur={() => handleBlur('mensaje')} className={fieldInvalid.mensaje ? 'is-invalid' : ''} />
                  <div className={`char-count${charWarn ? ' warn' : ''}`}>{charCount} / 1000</div>
                  {fieldErrors.mensaje && <div className="field-error visible">{fieldErrors.mensaje}</div>}
                </div>
                <button className="submit-btn" type="button" disabled={submitDisabled} onClick={handleSubmit} style={submitStyle}>{submitText}</button>
                {alertSuccess && <div className="form-alert success visible">✔ ¡Gracias! Recibimos su solicitud. Un asesor lo contactará pronto.</div>}
                {alertError && <div className="form-alert error visible">{alertErrorText}</div>}
                <p className="privacy-note">Sus datos son confidenciales y solo se usan para contactarle.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <p><strong>Corporación Madake SA de CV</strong> · Seguridad Privada · México</p>
        <p style={{ marginTop: '6px' }}>© 2025 Todos los derechos reservados</p>
      </footer>
    </>
  );
}