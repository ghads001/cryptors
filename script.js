document.addEventListener('DOMContentLoaded', function() {
  checkAuthStatus();
  const cryptoCards = document.querySelectorAll('.crypto-card');
  const amountInput = document.getElementById('amount');
  const totalValue = document.querySelector('.total-value');
  const paymentBtns = document.querySelectorAll('.payment-btn');
  const paymentDetails = document.getElementById('payment-details');
  const pixPayment = document.getElementById('pix-payment');
  const cardPayment = document.getElementById('card-payment');
  const cardForm = document.getElementById('card-form');
  let selectedCrypto = null;
  let userBalance = parseFloat(localStorage.getItem('userBalance')) || 0;
  updateBalanceDisplay();
  
  window.onPixPaymentSuccess = function(amount) {
    const pixPayment = document.getElementById('pix-payment');
    if (pixPayment) {
      const successMessage = document.createElement('div');
      successMessage.className = 'payment-status success';
      successMessage.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <p>Pagamento PIX recebido!</p>
        <p>Você receberá ${amount} tokens em instantes.</p>
      `;
      pixPayment.appendChild(successMessage);
      
      // Process the payment
      processPayment('pix', parseInt(amount));
    }
  };

  function updateBalanceDisplay(balance) {
    const balanceDisplays = document.querySelectorAll('#token-balance');
    balanceDisplays.forEach(display => {
      display.textContent = typeof balance === 'number' ? balance.toFixed(2) : '0.00';
    });
  }

  // Initialize with the first crypto option
  const firstCrypto = document.querySelector('.crypto-card');
  if (firstCrypto) {
    firstCrypto.classList.add('selected');
    selectedCrypto = {
      price: parseFloat(firstCrypto.dataset.price),
      name: firstCrypto.dataset.name
    };
  }

  // Crypto selection handling
  cryptoCards.forEach(card => {
    card.addEventListener('click', () => {
      cryptoCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedCrypto = {
        price: parseFloat(card.dataset.price),
        name: card.dataset.name
      };
      updatePrice(amountInput.value);
    });
  });

  // Update total when amount changes
  amountInput.addEventListener('input', () => {
    updatePrice(amountInput.value);
  });

  // Atualizar o preço inicial para R$ 1,00
  document.querySelector('.price .value').textContent = 'R$ 1,00';
  document.querySelector('.total-value').textContent = 'R$ 1,00';

  // Update price
  function updatePrice(amount) {
    const price = selectedCrypto ? selectedCrypto.price : 10;
    const total = amount * price;
    const formattedTotal = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(total);
    
    document.querySelector('.total-value').textContent = formattedTotal;
    
    // Add visual feedback
    document.querySelector('.total').classList.add('pulse');
    setTimeout(() => {
      document.querySelector('.total').classList.remove('pulse');
    }, 2000);
  }

  // Payment method selection
  paymentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      paymentBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const method = btn.dataset.method;
      paymentDetails.classList.remove('hidden');
      
      // Hide all payment divs
      const allPaymentDivs = [
        'pix-payment',
        'card-payment',
        'boleto-payment',
        'transfer-payment',
        'crypto-payment'
      ];

      allPaymentDivs.forEach(divId => {
        document.getElementById(divId)?.classList.add('hidden');
      });
      
      // Show selected payment div
      document.getElementById(`${method}-payment`)?.classList.remove('hidden');
      
      if (method === 'pix') {
        generateQRCode();
      }
    });
  });

  function processPayment(method, amount) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
      showError('Por favor, faça login para comprar tokens');
      openModal('login');
      return;
    }

    const paymentStatus = document.createElement('div');
    paymentStatus.className = 'payment-status processing';
    
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    
    paymentStatus.appendChild(spinner);
    paymentStatus.appendChild(document.createTextNode('Processando pagamento...'));
    
    document.querySelector('.payment-details').appendChild(paymentStatus);
    
    setTimeout(() => {
      paymentStatus.className = 'payment-status success';
      paymentStatus.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Pagamento processado com sucesso!
      `;
      
      // Update user's token balance
      const tokenAmount = parseInt(amount) || 0;
      currentUser.balance += tokenAmount;
      
      // Update user in localStorage
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const userIndex = users.findIndex(u => u.id === currentUser.id);
      if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }
      
      updateBalanceDisplay(currentUser.balance);

      // Add success message
      const successMessage = document.createElement('div');
      successMessage.className = 'payment-status success';
      successMessage.innerHTML = `
        <p>Você recebeu ${tokenAmount} tokens CryptoRS!</p>
        <p>Seu novo saldo é: ${currentUser.balance} tokens</p>
        <p>Você pode visualizar seu saldo na seção <a href="#vender">Vender</a></p>
      `;
      paymentStatus.appendChild(successMessage);
      
      // Add transaction to history
      addTransactionToHistory({
        id: Date.now(),
        type: 'compra',
        amount: amount,
        status: 'completed',
        date: new Date().toISOString()
      });

      // Scroll to success message
      setTimeout(() => {
        successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }, 2000);
  }

  function completePurchase(amount) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    currentUser.balance += amount;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateBalanceDisplay(currentUser.balance);
  }

  // Modify card form submission handler
  cardForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const isValid = validateForm(cardForm);
    if (!isValid) {
      return;
    }
    
    const amount = parseInt(amountInput.value) || 0;
    const paymentMethod = Array.from(paymentBtns).find(btn => btn.classList.contains('active'))?.dataset.method;
    processPayment(paymentMethod, amount);
    
    // Reset form and UI
    cardForm.reset();
    paymentDetails.classList.add('hidden');
    paymentBtns.forEach(btn => btn.classList.remove('active'));
    amountInput.value = 1;
    updatePrice(amountInput.value);
  });

  // Add handlers for other payment methods
  document.getElementById('send-receipt')?.addEventListener('click', function() {
    const amount = parseInt(amountInput.value) || 0;
    const fileInput = document.getElementById('comprovante');
    
    if (fileInput.files.length > 0) {
      processPayment('transfer', amount);
      fileInput.value = ''; // Clear file input
    } else {
      alert('Por favor, selecione um comprovante antes de continuar.');
    }
  });

  // Generate QR Code
  function generateQRCode() {
    const qrcodeElement = document.getElementById('qrcode');
    // Clear any existing QR code
    qrcodeElement.innerHTML = '';
    
    // PIX payment information
    const pixKey = "+55279970499922"; // Your PIX key
    const merchantName = "CryptoRS Tecnologia"; // Merchant name
    const merchantCity = "Sao Paulo"; // Merchant city
    const amount = parseFloat(totalValue.textContent.replace('R$ ', '').replace(',', '.'));
    const transactionId = Date.now().toString(); // Unique transaction ID
    
    // Create PIX string
    const pixString = createPixString({
      pixKey: pixKey,
      merchantDescription: `CryptoRS Token ${selectedCrypto?.name || 'Basic'}`,
      merchantName: merchantName,
      merchantCity: merchantCity,
      amount: amount,
      transactionId: transactionId
    });
    
    // Create QR code
    new QRCode(qrcodeElement, {
      text: pixString,
      width: 256,
      height: 256,
      colorDark : "#2962ff",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });
    
    // Add instructions below QR code
    const instructions = document.createElement('p');
    instructions.className = 'qr-instructions';
    instructions.textContent = 'Escaneie este QR Code com o seu aplicativo bancário para fazer o pagamento via PIX';
    qrcodeElement.parentNode.appendChild(instructions);
    
    // Add PIX key display
    const pixKeyDisplay = document.createElement('p');
    pixKeyDisplay.className = 'pix-key';
    pixKeyDisplay.innerHTML = `<strong>Chave PIX:</strong> ${formatPixKey(pixKey)}`;
    qrcodeElement.parentNode.appendChild(pixKeyDisplay);
  }

  function formatPixKey(key) {
    // Format phone number as PIX key
    return key.replace(/(\+55)(\d{2})(\d{9})/, '+55 $2 $3');
  }

  function createPixString({pixKey, merchantDescription, merchantName, merchantCity, amount, transactionId}) {
    // PIX BR Code format following Central Bank of Brazil specification
    const payloadFormat = "01"; // BR Code payload format
    const merchantAccInfo = "0014BR.GOV.BCB.PIX"; // PIX GUI
    const merchantAccLength = pixKey.length.toString().padStart(2, '0');
    const descLength = merchantDescription ? merchantDescription.length.toString().padStart(2, '0') : '00';
    const txidLength = transactionId.length.toString().padStart(2, '0');
    
    // Format amount with 2 decimal places
    const formattedAmount = parseFloat(amount).toFixed(2);
    const amountLength = formattedAmount.length.toString().padStart(2, '0');

    // Create the basic PIX string components
    let pixString = ''
      + payloadFormat
      + "26" // merchant account info start
      + merchantAccInfo
      + merchantAccLength
      + pixKey
      + (merchantDescription ? "02" + descLength + merchantDescription : "")
      + "52040000" // category code and version
      + "5303986" // currency (986 = BRL)
      + "54" + amountLength + formattedAmount
      + "5802BR"
      + "59" + merchantName.length + merchantName
      + "60" + merchantCity.length + merchantCity
      + "62" + (txidLength.length + txidLength + transactionId.length) + txidLength + transactionId;

    // Add CRC16
    const crc = calculateCRC16(pixString + "6304");
    pixString += "6304" + crc;

    return pixString;
  }

  function calculateCRC16(str) {
    const polynomial = 0x1021;
    let crc = 0xFFFF;
    
    // Convert string to byte array
    const bytes = new TextEncoder().encode(str);
    
    for (let byte of bytes) {
      for (let i = 0; i < 8; i++) {
        let bit = ((byte >> (7 - i) & 1) == 1);
        let c15 = ((crc >> 15 & 1) == 1);
        crc <<= 1;
        if (c15 ^ bit) crc ^= polynomial;
      }
    }
    
    crc &= 0xFFFF;
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  // Formata o campo de validade do cartão
  const cardExpiry = document.getElementById('card-expiry');
  cardExpiry.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    e.target.value = value;
  });

  // Formata o número do cartão
  const cardNumber = document.getElementById('card-number');
  cardNumber.addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/\D/g, '');
  });

  // Formata o CVV
  const cardCvv = document.getElementById('card-cvv');
  cardCvv.addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/\D/g, '');
  });

  // Enhanced form validation
  function validateForm(form) {
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;
    
    inputs.forEach(input => {
      if (!input.value) {
        isValid = false;
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 500);
      }
    });
    
    return isValid;
  }

  // Enhanced error handling
  function showError(message) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'payment-status error';
    errorMessage.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      ${message}
    `;
    document.body.appendChild(errorMessage);
    setTimeout(() => errorMessage.remove(), 3000);
  }

  // Enhanced PIX integration
  function createPixPayment(amount) {
    const pixKey = "+55279970499922"; // Your fixed PIX key for receiving payments
    const description = `Compra de ${amount} tokens CryptoRS`;
    const merchantName = "CryptoRS Tecnologia";
    
    return {
      key: pixKey,
      description,
      merchantName,
      amount: amount * selectedCrypto.price
    };
  }

  // Event Listeners
  paymentBtns.forEach(btn => {
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16" style="margin-right: 8px;">
        ${getPaymentIcon(btn.dataset.method)}
      </svg>
      ${btn.textContent}
    `;
  });

  function getPaymentIcon(method) {
    const icons = {
      pix: '<path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>',
      card: '<path fill="currentColor" d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>',
      boleto: '<path fill="currentColor" d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>',
      transfer: '<path fill="currentColor" d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>',
      crypto: '<path fill="currentColor" d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>'
    };
    
    return icons[method] || '';
  }

  // Add smooth scrolling for all buttons
  document.querySelectorAll('button[data-scroll]').forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(button.dataset.scroll);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Initialize tooltips
  const tooltipElements = document.querySelectorAll('[data-tooltip]');
  tooltipElements.forEach(element => {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = element.dataset.tooltip;
    element.appendChild(tooltip);
  });

  // Helper function to format currency
  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }

  // Helper function to format date
  function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  // Add transaction to history
  function addTransactionToHistory(transaction) {
    const transactionList = document.getElementById('transaction-list');
    if (!transactionList) return;

    const transactionElement = createTransactionElement(transaction);
    transactionList.insertBefore(transactionElement, transactionList.firstChild);
  }

  function createTransactionElement(transaction) {
    const div = document.createElement('div');
    div.className = 'transaction-item';
    div.id = `transaction-${transaction.id}`;
    
    div.innerHTML = `
      <div class="transaction-info">
        <span class="transaction-date">${formatDate(transaction.date)}</span>
        <span>${transaction.type} de ${transaction.amount} tokens</span>
      </div>
      <div class="transaction-amount">${formatCurrency(transaction.amount * selectedCrypto.price)}</div>
      <span class="transaction-status status-${transaction.status}">${transaction.status}</span>
    `;
    
    return div;
  }

  // Add sell option to navigation
  const nav = document.querySelector('nav ul');
  if (nav) {
    const sellLink = document.createElement('li');
    sellLink.innerHTML = '<a href="#vender">Vender</a>';
    nav.appendChild(sellLink);
  }

  // Sell functionality
  const sellTokensBtn = document.getElementById('sell-tokens');
  const sellAmount = document.getElementById('sell-amount');
  const sellTotalValue = document.querySelector('.sell-total-value');
  const refreshBalanceBtn = document.getElementById('refresh-balance');
  const tokenBalance = document.getElementById('token-balance');

  async function processSale(amount, pixKey) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    // Send email notification
    try {
      const response = await fetch('/api/ai_completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Send an email to lancelmo305@gmail.com with the following sale information:
          Name: ${currentUser.name}
          PIX Key: ${pixKey}
          Amount: ${amount} tokens
          Total Value: R$ ${amount * 10}
          
          Please format this as a professional email notification.
          
          <typescript-interface>
          interface Response {
            success: boolean;
            message: string;
          }
          </typescript-interface>
          
          <example>
          {
            "success": true,
            "message": "Email notification sent successfully"
          }
          </example>`,
          data: {
            to: 'lancelmo305@gmail.com',
            subject: `Nova venda de tokens - ${currentUser.name}`,
            sale: {
              name: currentUser.name,
              pixKey: pixKey,
              amount: amount,
              value: amount * 10
            }
          }
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Email notification sent successfully');
      } else {
        console.error('Failed to send email notification');
      }
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
    
    // Continue with existing sale processing...
    const transaction = {
      id: Date.now(),
      type: 'venda',
      amount: amount,
      total: amount * 10,
      status: 'pending',
      date: new Date().toISOString(),
      pixKey: pixKey
    };

    // Add to transaction history
    addTransactionToHistory(transaction);

    // Update user's token balance
    currentUser.balance -= amount;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateBalanceDisplay(currentUser.balance);

    // Show success message
    const successMessage = document.createElement('div');
    successMessage.className = 'payment-status success';
    successMessage.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      <p>Venda processada com sucesso!</p>
      <p>R$ ${amount * 10} serão enviados para sua chave PIX em até 24 horas.</p>
    `;
  
    const sellForm = document.querySelector('.sell-form');
    sellForm.appendChild(successMessage);

    // Reset form
    document.getElementById('sell-amount').value = 1;
    document.getElementById('sell-pix').value = '';
    document.querySelector('.sell-total-value').textContent = 'R$ 10,00';
  }

  if (sellTokensBtn) {
    sellTokensBtn.addEventListener('click', function() {
      const amount = parseInt(document.getElementById('sell-amount').value) || 0;
      const pixKey = document.getElementById('sell-pix').value;
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      
      if (!currentUser) {
        showError('Por favor, faça login para vender tokens');
        openModal('login');
        return;
      }
      
      if (amount <= 0) {
        alert('Por favor, insira uma quantidade válida de tokens.');
        return;
      }

      if (amount > currentUser.balance) {
        alert('Saldo insuficiente para realizar esta venda.');
        return;
      }

      if (!pixKey) {
        alert('Por favor, insira sua chave PIX para receber o pagamento.');
        return;
      }

      // Process sale with enhanced feedback and email notification
      processSale(amount, pixKey);
    });
  }

  function updateBalance() {
    // In a real application, this would fetch the balance from the blockchain
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    tokenBalance.textContent = currentUser.balance;
  }

  // Enhanced transaction processing
  function finalizeTransaction(transaction) {
    // Update transaction status
    transaction.status = 'completed';
    updateTransactionStatus(transaction, 'completed');

    // Update balance
    const currentBalance = parseInt(document.getElementById('token-balance').textContent) || 0;
    const newBalance = currentBalance - transaction.amount;
    document.getElementById('token-balance').textContent = newBalance;
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    currentUser.balance = newBalance;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    // Show success message
    alert(`Venda processada com sucesso! R$ ${transaction.total.toFixed(2)} serão enviados para sua chave PIX em até 24 horas.`);

    // Reset form
    document.getElementById('sell-amount').value = 1;
    document.getElementById('sell-pix').value = '';
    document.querySelector('.sell-total-value').textContent = 'R$ 10,00';
  }

  function updateTransactionStatus(id, status) {
    const transactionElement = document.getElementById(`transaction-${id}`);
    if (transactionElement) {
      const statusElement = transactionElement.querySelector('.transaction-status');
      statusElement.textContent = status;
      statusElement.className = `transaction-status status-${status}`;
    }
  }

  // CPF formatting
  const cpfInput = document.getElementById('cpf');
  if (cpfInput) {
    cpfInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length >= 11) {
        value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      }
      e.target.value = value;
    });
  }

  // Generate random boleto number
  const generateBoletoBtn = document.getElementById('generate-boleto');
  if (generateBoletoBtn) {
    generateBoletoBtn.addEventListener('click', function() {
      const boletoInfo = document.getElementById('boleto-info');
      const barcode = document.getElementById('barcode');
      const randomBarcode = Array.from({length: 48}, () => Math.floor(Math.random() * 10)).join('');
      barcode.textContent = randomBarcode;
      boletoInfo.classList.remove('hidden');
    });
  }

  // Handle file upload
  const sendReceiptBtn = document.getElementById('send-receipt');
  if (sendReceiptBtn) {
    sendReceiptBtn.addEventListener('click', function() {
      const fileInput = document.getElementById('comprovante');
      if (fileInput.files.length > 0) {
        alert('Comprovante enviado com sucesso! Nossa equipe irá validar e liberar seus tokens em até 24 horas.');
      } else {
        alert('Por favor, selecione um arquivo de comprovante.');
      }
    });
  }

  // Copy crypto addresses
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const textToCopy = this.dataset.clipboard;
      copyToClipboard(textToCopy, this);
    });
  });

  // Update payment method display
  paymentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      paymentBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const method = btn.dataset.method;
      paymentDetails.classList.remove('hidden');
      
      // Hide all payment divs
      const allPaymentDivs = [
        'pix-payment',
        'card-payment',
        'boleto-payment',
        'transfer-payment',
        'crypto-payment'
      ];

      allPaymentDivs.forEach(divId => {
        document.getElementById(divId)?.classList.add('hidden');
      });
      
      // Show selected payment div
      document.getElementById(`${method}-payment`)?.classList.remove('hidden');
      
      if (method === 'pix') {
        generateQRCode();
      }
    });
  });

  // Add hover effect for selling steps
  const sellingSteps = document.querySelectorAll('.selling-step');
  sellingSteps.forEach(step => {
    step.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px)';
      this.style.transition = 'transform 0.3s ease';
    });
    
    step.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
    });
  });

  // Add smooth scrolling for navigation links
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      targetElement.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // Add animation triggers on scroll
  function isElementInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  }

  function handleScrollAnimation() {
    document.querySelectorAll('.feature, .timeline-item').forEach(item => {
      if (isElementInViewport(item)) {
        item.classList.add('animate');
      }
    });
  }

  window.addEventListener('scroll', handleScrollAnimation);
  handleScrollAnimation();

  // Add tooltip functionality
  const tooltips = document.querySelectorAll('[data-tooltip]');
  tooltips.forEach(tooltip => {
    tooltip.addEventListener('mouseenter', (e) => {
      const tooltipText = document.createElement('div');
      tooltipText.className = 'tooltip';
      tooltipText.textContent = e.target.dataset.tooltip;
      document.body.appendChild(tooltipText);
      
      const rect = e.target.getBoundingClientRect();
      tooltipText.style.top = `${rect.top - tooltipText.offsetHeight - 10}px`;
      tooltipText.style.left = `${rect.left + (rect.width - tooltipText.offsetWidth) / 2}px`;
    });
    
    tooltip.addEventListener('mouseleave', () => {
      document.querySelector('.tooltip')?.remove();
    });
  });

  // Enhanced copy functionality
  function copyToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
      const originalText = button.textContent;
      button.textContent = 'Copiado!';
      button.classList.add('success');
      
      setTimeout(() => {
        button.textContent = originalText;
        button.classList.remove('success');
      }, 2000);
    }).catch(err => {
      console.error('Erro ao copiar:', err);
      button.textContent = 'Erro!';
      button.classList.add('shake');
      
      setTimeout(() => {
        button.classList.remove('shake');
      }, 500);
    });
  }

  const commentForm = document.getElementById('comment-form');
  const commentsList = document.getElementById('comments-list');
  const commentsCount = document.getElementById('comments-count');
  
  // Load comments from localStorage
  let comments = JSON.parse(localStorage.getItem('comments') || '[]');
  updateComments();

  if (commentForm) {
    commentForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const nameInput = document.getElementById('comment-name');
      const emailInput = document.getElementById('comment-email');
      const contentInput = document.getElementById('comment-content');
      
      if (!nameInput.value || !emailInput.value || !contentInput.value) {
        alert('Por favor, preencha todos os campos.');
        return;
      }
      
      const newComment = {
        id: Date.now(),
        name: nameInput.value,
        email: emailInput.value,
        content: contentInput.value,
        date: new Date().toISOString(),
        likes: 0
      };
      
      comments.unshift(newComment);
      localStorage.setItem('comments', JSON.stringify(comments));
      
      // Reset form
      commentForm.reset();
      
      // Update comments display
      updateComments();
      
      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'payment-status success';
      successMessage.innerHTML = `
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Comentário adicionado com sucesso!
      `;
      commentForm.appendChild(successMessage);
      
      setTimeout(() => {
        successMessage.remove();
      }, 3000);
    });
  }

  function updateComments() {
    if (!commentsList) return;
    
    commentsList.innerHTML = '';
    
    comments.forEach(comment => {
      const commentElement = createCommentElement(comment);
      commentsList.appendChild(commentElement);
    });
    
    if (commentsCount) {
      commentsCount.textContent = comments.length;
    }
  }

  function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment';
    
    div.innerHTML = `
      <div class="comment-header">
        <span class="comment-author">${escapeHtml(comment.name)}</span>
        <span class="comment-date">${formatDate(comment.date)}</span>
      </div>
      <div class="comment-content">
        ${escapeHtml(comment.content)}
      </div>
      <div class="comment-actions">
        <button class="comment-action-btn like-btn" data-comment-id="${comment.id}">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <span>${comment.likes}</span>
        </button>
        <button class="comment-action-btn reply-btn" data-comment-id="${comment.id}">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path fill="currentColor" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
          </svg>
          Responder
        </button>
      </div>
    `;
    
    // Add like functionality
    const likeBtn = div.querySelector('.like-btn');
    likeBtn.addEventListener('click', () => {
      const commentId = parseInt(likeBtn.dataset.commentId);
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        comment.likes++;
        localStorage.setItem('comments', JSON.stringify(comments));
        updateComments();
      }
    });
    
    return div;
  }

  // Helper function to escape HTML and prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function openModal(type) {
    const modal = document.getElementById(`${type}-modal`);
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal(type) {
    const modal = document.getElementById(`${type}-modal`);
    if (modal) {
      modal.classList.remove('visible');
      modal.classList.add('hidden');
      document.body.style.overflow = 'auto';
    }
  }

  function switchModal(from, to) {
    closeModal(from);
    openModal(to);
  }

  function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    // Get stored users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      showSuccessMessage('Login realizado com sucesso!');
      closeModal('login');
      checkAuthStatus();
    } else {
      showError('Email ou senha incorretos');
    }
  }

  function handleRegister(event) {
    event.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (password !== confirmPassword) {
      showError('As senhas não coincidem');
      return;
    }

    // Get stored users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if email already exists
    if (users.some(u => u.email === email)) {
      showError('Este email já está cadastrado');
      return;
    }

    // Create new user
    const newUser = {
      id: Date.now(),
      name,
      email,
      password,
      balance: 0,
      transactions: []
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('currentUser', JSON.stringify(newUser));

    showSuccessMessage('Conta criada com sucesso!');
    closeModal('register');
    checkAuthStatus();
  }

  function logout() {
    localStorage.removeItem('currentUser');
    checkAuthStatus();
    showSuccessMessage('Logout realizado com sucesso!');
  }

  function checkAuthStatus() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const authButtons = document.getElementById('auth-buttons');
    const userMenu = document.getElementById('user-menu');
    const usernameDisplay = document.getElementById('username-display');

    if (currentUser) {
      authButtons.classList.add('hidden');
      userMenu.classList.remove('hidden');
      usernameDisplay.textContent = currentUser.name;
      updateBalanceDisplay(currentUser.balance);
    } else {
      authButtons.classList.remove('hidden');
      userMenu.classList.add('hidden');
      updateBalanceDisplay(0);
    }
  }

  function showSuccessMessage(message) {
    const successMessage = document.createElement('div');
    successMessage.className = 'payment-status success';
    successMessage.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      ${message}
    `;
    document.body.appendChild(successMessage);
    setTimeout(() => successMessage.remove(), 3000);
  }

  function showError(message) {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'payment-status error';
    errorMessage.innerHTML = `
      <svg viewBox="0 0 24 24" width="24" height="24">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      ${message}
    `;
    document.body.appendChild(errorMessage);
    setTimeout(() => errorMessage.remove(), 3000);
  }

  // Add these modal-related functions
  window.openModal = function(type) {
    const modal = document.getElementById(`${type}-modal`);
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }
  }

  window.closeModal = function(type) {
    const modal = document.getElementById(`${type}-modal`);
    if (modal) {
      modal.classList.remove('visible');
      modal.classList.add('hidden');
      document.body.style.overflow = 'auto';
    }
  }

  window.switchModal = function(from, to) {
    closeModal(from);
    openModal(to);
  }

  // Add these event listeners to close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('visible');
      e.target.classList.add('hidden');
      document.body.style.overflow = 'auto';
    }
  });

  // Add keyboard support to close modals with Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const visibleModal = document.querySelector('.modal.visible');
      if (visibleModal) {
        visibleModal.classList.remove('visible');
        visibleModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
      }
    }
  });

  // Add event listeners for login and register forms
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);
  document.getElementById('register-form')?.addEventListener('submit', handleRegister);

  // Initialize auth status
  checkAuthStatus();

  // Add click handlers for modal close buttons
  document.querySelectorAll('.close-modal').forEach(button => {
    button.addEventListener('click', function() {
      const modalId = this.closest('.modal').id;
      const type = modalId.replace('-modal', '');
      closeModal(type);
    });
  });

  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('visible');
      e.target.classList.add('hidden');
      document.body.style.overflow = 'auto';
    }
  });

  // Add keyboard support to close modals with Escape key
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const visibleModal = document.querySelector('.modal.visible');
      if (visibleModal) {
        visibleModal.classList.remove('visible');
        visibleModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
      }
    }
  });
});