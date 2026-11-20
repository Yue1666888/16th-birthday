package com.sipc115.birthday.web.filter;

import com.sipc115.birthday.common.api.ApiErrorWriter;
import com.sipc115.birthday.common.api.ErrorCode;
import com.sipc115.birthday.common.exceptions.BusinessException;

import jakarta.servlet.*;
import jakarta.servlet.http.*;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.*;
import java.nio.charset.StandardCharsets;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RequestBodyLimitFilter extends OncePerRequestFilter {
    private final ApiErrorWriter errors;

    public RequestBodyLimitFilter(ApiErrorWriter errors) {
        this.errors = errors;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String type = request.getContentType();
        if (type == null) {
            chain.doFilter(request, response);
            return;
        }
        boolean json = type.toLowerCase().startsWith("application/json");
        long maximum = json ? 1048576 : 11534336;
        if (request.getContentLengthLong() > maximum) {
            errors.write(response, ErrorCode.REQUEST_TOO_LARGE);
            return;
        }
        if (!json) {
            chain.doFilter(request, response);
            return;
        }
        var wrapped =
                new HttpServletRequestWrapper(request) {
                    private ServletInputStream stream;

                    @Override
                    public ServletInputStream getInputStream() throws IOException {
                        if (stream == null) {
                            var input = super.getInputStream();
                            stream =
                                    new ServletInputStream() {
                                        private long count;

                                        private void counted(int length) {
                                            if (length > 0) {
                                                count += length;
                                            }
                                            if (count > maximum) {
                                                throw new BusinessException(
                                                        ErrorCode.REQUEST_TOO_LARGE);
                                            }
                                        }

                                        @Override
                                        public int read() throws IOException {
                                            int value = input.read();
                                            counted(value < 0 ? 0 : 1);
                                            return value;
                                        }

                                        @Override
                                        public int read(byte[] bytes, int offset, int length)
                                                throws IOException {
                                            int read = input.read(bytes, offset, length);
                                            counted(read);
                                            return read;
                                        }

                                        @Override
                                        public boolean isFinished() {
                                            return input.isFinished();
                                        }

                                        @Override
                                        public boolean isReady() {
                                            return input.isReady();
                                        }

                                        @Override
                                        public void setReadListener(ReadListener listener) {
                                            input.setReadListener(listener);
                                        }
                                    };
                        }
                        return stream;
                    }

                    @Override
                    public BufferedReader getReader() throws IOException {
                        return new BufferedReader(
                                new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
                    }
                };
        chain.doFilter(wrapped, response);
    }
}
